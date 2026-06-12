# !ls /usr/share/tesseract-ocr/
# !ls /usr/share/tesseract-ocr/4.00/tessdata
# !cp /content/e13b.traineddata /usr/share/tesseract-ocr/4.00/tessdata/
# !tesseract --list-langs

# !apt-get update
# !apt-get install -y tesseract-ocr
# !pip install pytesseract pillow opencv-python-headless python-dateutil

import io, os, re, base64, logging

from PIL import Image
import pytesseract
from dateutil import parser as dateparser
import cv2
import numpy as np

logger = logging.getLogger(__name__)

TESSDATA_DIR = os.path.join(os.path.dirname(__file__), "tessdata")

def image_file_to_data_url(path: str):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    mime = "image/png" if path.lower().endswith(".png") else "image/jpeg"
    return f"data:{mime};base64,{b64}"

def order_points(pts):
    # pts: (4,2) array
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).ravel()

    rect[0] = pts[np.argmin(s)]      # top-left: min sum
    rect[2] = pts[np.argmax(s)]      # bottom-right: max sum
    rect[1] = pts[np.argmin(diff)]   # top-right: min (x - y)
    rect[3] = pts[np.argmax(diff)]   # bottom-left: max (x - y)
    return rect

def four_point_warp(image, pts, border=0):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # compute width and height of the new image
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))

    # destination points (optionally add outer border)
    dst = np.array([
        [0+border,       0+border],
        [maxWidth-1-border, 0+border],
        [maxWidth-1-border, maxHeight-1-border],
        [0+border,       maxHeight-1-border]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight), flags=cv2.INTER_CUBIC)
    return warped, rect

def detect_check_corners(image_bgr, debug=False):
    """
    Returns:
      corners (4x2 float32) in the original image coordinates, or None if not found.
    Strategy:
      - convert to gray
      - blur a bit
      - edge detect (Canny)
      - close gaps (morph)
      - find largest quadrilateral contour by area ratio + approxPolyDP
    """
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)

    # Adaptive equalization helps on uneven lighting
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        gray_eq = clahe.apply(blur)
    except:
        gray_eq = blur

    edges = cv2.Canny(gray_eq, 50, 150)

    # Close small gaps in edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
    edges_closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find external contours
    cnts = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[0] if len(cnts) == 2 else cnts[1]

    if not cnts:
        return None

    # Sort contours by area (largest first)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    img_area = float(h*w)
    best = None
    for c in cnts[:10]:  # inspect a few largest
        area = cv2.contourArea(c)
        if area < 0.15*img_area:  # heuristic: check should occupy decent portion
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02*peri, True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            best = approx.reshape(4,2).astype("float32")
            break

    if debug:
        vis = image_bgr.copy()
        if best is not None:
            cv2.polylines(vis, [best.astype(int)], True, (0,255,0), 3)
        for i, c in enumerate(cnts[:5]):
            cv2.drawContours(vis, [c], -1, (255,0,0), 1)

    return best

def auto_detect_check_and_warp(image_bgr, debug=False):
    """
    Detect the check quad, warp to a top-down view, and optionally do a tiny deskew pass.
    Returns (warped_bgr, corners_rect) or (None, None) if not found.
    """
    corners = detect_check_corners(image_bgr, debug=debug)
    if corners is None:
        if debug: logger.debug("No quadrilateral found.")
        return None, None

    warped, rect = four_point_warp(image_bgr, corners, border=0)

    # Ensure landscape orientation (checks are wider than tall). Rotate if needed.
    if warped.shape[0] > warped.shape[1]:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

    # Optional: trim a small border (helps remove black edges from warp)
    warped = trim_border(warped, px=4)

    return warped, rect

def trim_border(img_bgr, px=3):
    h, w = img_bgr.shape[:2]
    y0 = min(px, h-1); y1 = max(h-px, px+1)
    x0 = min(px, w-1); x1 = max(w-px, px+1)
    return img_bgr[y0:y1, x0:x1].copy()

class CheckExtractor:
    def __init__(self):
        """Initialize the improved OCR processor with advanced preprocessing."""
        pass

    def decode_data_url(self, data_url: str) -> np.ndarray:
        """Convert data URL to OpenCV image format."""
        header, b64data = data_url.split(",", 1)
        img_bytes = base64.b64decode(b64data)

        # Convert to PIL Image first
        pil_img = Image.open(io.BytesIO(img_bytes))

        # Convert PIL to OpenCV format
        img_array = np.array(pil_img)

        # Convert RGB to BGR for OpenCV
        if len(img_array.shape) == 3:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        return img_array

    def clean_for_ocr(self, img):
        """Apply gentle preprocessing for better OCR results."""

        adaptive = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 5
        )

        # Return the adaptive threshold as it usually works best for printed text
        return adaptive

    def crop_rel(self, img, rel_box):
        """Crop image using relative coordinates (0-1 range)."""
        H, W = img.shape[:2]
        x, y, w, h = rel_box
        x1, y1 = int(x*W), int(y*H)
        x2, y2 = int((x+w)*W), int((y+h)*H)
        return img[y1:y2, x1:x2]

    def parse_amount(self, text):
        """Extract currency amount from text."""
        text = text.replace(',', '').replace('O', '0')
        m = re.search(r'(\d+\.\d{2}|\d+)', text)
        return m.group(1) if m else ''

    def parse_date(self, text):
        """Parse date with fuzzy matching. Return '' if invalid."""
        if not text:
            return ''

        # Basic cleanup
        raw = text.strip()
        # remove non-date-like characters except digits and separators
        cleaned = re.sub(r"[^0-9/.\- ]", "", raw)
        cleaned = cleaned.strip()

        # Must contain at least two separators or be at least 6 digits
        # otherwise it's almost certainly not a valid date
        if len(re.findall(r"[0-9]", cleaned)) < 6 or cleaned.count("/") + cleaned.count("-") + cleaned.count(".") == 0:
            return ''

        try:
            dt = dateparser.parse(cleaned, fuzzy=False, dayfirst=False)
            if not dt:
                return ''
            return dt.strftime('%Y-%m-%d')
        except Exception:
            return ''

    def parse_micr(self, s: str):
        s = s.replace(" ", "")
        # Match sequences of digits separated by any of A/B/C/D (possibly repeated)
        match = re.search(r'[ABCD]+\s*(\d+)[ABCD]+\s*(\d+)[ABCD]+\s*(\d+)', s)
        
        if match:
            return match.groups()
        
        return (None, None, None)

    def bytes_to_cv2(self, data: bytes) -> np.ndarray:
        """Convert raw image bytes into an OpenCV BGR image."""
        if not isinstance(data, (bytes, bytearray)):
            raise TypeError(f"Expected bytes, got {type(data)}")

        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("cv2.imdecode failed; invalid or unsupported image bytes")

        return img

    def extract_check_fields(self, img_bytes: bytes):
        """Main pipeline to extract check information using improved OCR."""
        config = '--oem 3 --psm 7'

        try:
            # Convert data URL to OpenCV image
            original = self.bytes_to_cv2(img_bytes)
            img = original.copy()

            # Upscale if image is too small
            if max(img.shape[:2]) < 1200:
                scale = 1200.0 / max(img.shape[:2])
                img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            # Convert to grayscale and preprocess
            warped, rect = auto_detect_check_and_warp(img, debug=True)
            gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

            # Try both with and without deskewing
            gray_original = gray.copy()
            proc = self.clean_for_ocr(gray_original)

            # Define regions of interest (customized for your check layout)
            ROIS = {
              "date": (0.74, 0.24, 0.18, 0.10),
              "payee": (0.15, 0.39, 0.55, 0.10),
              "amount_numeric": (0.72, 0.39, 0.24, 0.10),
              "amount_words": (0.04, 0.51, 0.84, 0.10),
              "memo": (0.095, 0.68, 0.48, 0.10),
              "micr": (0.03, 0.82, 0.60, 0.11),
            }

            results = {}

            # Extract DATE
            roi_date = self.crop_rel(proc, ROIS["date"])
            date_txt = pytesseract.image_to_string(roi_date, config=config).strip()
            results["raw_date"] = date_txt
            results["date"] = self.parse_date(date_txt)

            logger.debug("Extracted date: %s", date_txt)

            # Extract PAYEE
            roi_payee = self.crop_rel(proc, ROIS["payee"])

            payee_txt = pytesseract.image_to_string(roi_payee, config=config).strip()
            payee_txt = re.sub(r'[^A-Za-z0-9 \'.,&-]', '', payee_txt)
            logger.debug("Extracted payee: %s", payee_txt)

            results["payee"] = payee_txt



            # Extract AMOUNT (numeric)
            # roi_amt_num = self.crop_rel(proc, ROIS["amount_numeric"])
            # amt_num_txt = pytesseract.image_to_string(roi_amt_num, config=f'{config} -c tessedit_char_whitelist=$0123456789.,').strip()
            # results["raw_amount_numeric"] = amt_num_txt
            # results["amount"] = self.parse_amount(amt_num_txt)

            # print("Extracted Amount:", amt_num_txt)



            # Extract MEMO (optional)
            roi_memo = self.crop_rel(proc, ROIS["memo"])
            memo_txt = pytesseract.image_to_string(roi_memo, config=config).strip()
            memo_txt = re.sub(r'[^A-Za-z0-9 \'.,&-]', '', memo_txt)
            results["memo"] = memo_txt

            logger.debug("Extracted Memo: %s", memo_txt)

            # Extract the full MICR line once
            roi_micr = self.crop_rel(proc, ROIS["micr"])
            micr_txt = pytesseract.image_to_string(roi_micr, lang='e13b', config=f'--psm 7 --tessdata-dir "{TESSDATA_DIR}" -c load_system_dawg=0 -c load_freq_dawg=0 -c tessedit_char_whitelist=0123456789ABCDabcd:|').strip()
            results["micr_raw"] = micr_txt

            routing, account, check = self.parse_micr(micr_txt)
            logger.debug("MICR — Routing: %s Account: %s Check: %s", routing, account, check)

            # Check if ROI extraction was actually successful
            # Consider it successful only if we got meaningful data
            extracted_fields = 0
            if results["payee"] and len(re.sub(r'[^A-Za-z]', '', results["payee"])) >= 3:
                extracted_fields += 1
            if results["date"]:
                extracted_fields += 1
            if results["memo"]:
                extracted_fields += 1
            if results["micr_raw"]:
                extracted_fields += 1

            roi_success = extracted_fields >= 2

            return {
                "success": roi_success,
                "payee_name": payee_txt,
                "date": results["date"],
                "memo": memo_txt,
                "routing_no": routing,
                "payer_account_id": account,
                "check_no": check,
            }

        except Exception as e:
            logger.error("OCR failed: %s", e)

            return {
                "success": False
            }