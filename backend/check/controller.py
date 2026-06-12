from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Response

from typing import List
from bson import ObjectId
from datetime import datetime

from database.core import get_db
from auth.service import get_current_user, require_scope
from .schemas import *
from .service import *

from database.mongo_decimal import to_decimal128


import base64, io, sys, os, logging
sys.path.append(os.path.dirname(__file__))
from PIL import Image, ImageOps
from llm_service import CheckProcessorLLM
from check_extractor import CheckExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

check_extractor = CheckExtractor()

# LLM service is optional — the endpoint falls back to OCR+regex if the API key
# is absent or the Vision API call fails.
try:
    llm_service = CheckProcessorLLM()
    llm_available = True
    logger.info("LLM service initialized successfully")
except Exception as e:
    llm_service = None
    llm_available = False
    logger.warning(f"LLM service unavailable: {str(e)}")

router = APIRouter(prefix="/checks", tags=["checks"])

MAX_BYTES = 16 * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/png"};

def _validate_file_bytes(data: bytes, mime: str):
  if not data:
    raise HTTPException(400, "Empty file")
  if len(data) > MAX_BYTES:
    raise HTTPException(413, "File too large (>16MB)")
  if mime not in ALLOWED_MIME:
    raise HTTPException(415, f"Unsupported type: {mime}")

def decode_data_url(data_url: str) -> Image.Image:
    header, b64data = data_url.split(",", 1)
    img_bytes = base64.b64decode(b64data)
    img = Image.open(io.BytesIO(img_bytes))
    img = ImageOps.grayscale(img)
    return img

@router.post("")
async def post_check(
  account_id: str = Form(..., min_length=1),
  amount: float = Form(...),
  front: UploadFile = File(...),
  back: UploadFile = File(...),
  user=Depends(require_scope("customer", "manager")), 
  db=Depends(get_db),
):
  if amount <= 0:
    raise HTTPException(400, "amount must be > 0")

  front_bytes = await front.read()
  back_bytes  = await back.read()

  _validate_file_bytes(front_bytes, front.content_type or "application/octet-stream")
  _validate_file_bytes(back_bytes, back.content_type or "application/octet-stream")

  base_doc = {
    "customer_id": ObjectId(user['sub']),
    "_id": ObjectId(),
    "account_id": ObjectId(account_id),
    "amount": to_decimal128(amount),
    "status": 'pending',
    "front": {
      "name": front.filename,
      "mime": front.content_type,
      "size": len(front_bytes),
      "data": front_bytes,
    },
    "back": {
      "name": back.filename,
      "mime": back.content_type,
      "size": len(back_bytes),
      "data": back_bytes,
    },
    "created_at": datetime.utcnow(),
  }

  results = check_extractor.extract_check_fields(front_bytes)
  doc = {**base_doc, **results}

  try:
    res = await db['checks'].insert_one(doc)
    _id = str(res.inserted_id)
    content={"message": f"id: {_id}"}
    return Response(status_code=status.HTTP_201_CREATED)
  except Exception as e:
    logger.info(str(e))
    return {"message": "Something went wrong"}


@router.post("/ocr")
async def upload(payload: OCRPayload):
    logger.info("Starting check processing...")
    if llm_available and llm_service:
        logger.info("LLM service available - Using Vision API for image processing")
        logger.info("OCR and regex will be skipped if Vision API succeeds")
        
        # Try Vision API directly first
        try:
            logger.info("Processing check image with Vision API...")
            logger.info("Sending image to GPT-4 Vision for extraction")
            llm_results = llm_service.process_check_image(payload.imageDataUrl)
            
            if llm_results.get("extraction_success"):
                logger.info("Vision API processing completed successfully")
                logger.info(f"Vision API results: payee={llm_results.get('payee_name')}, date={llm_results.get('date')}, amount={llm_results.get('amount')}")
                logger.info("Vision API was used - OCR and regex were skipped")
                
                return {
                    "raw_text": "",  # No OCR text when using vision API
                    "structured_data": {
                        "payee_name": llm_results.get("payee_name"),
                        "date": llm_results.get("date"),
                        "amount": llm_results.get("amount"),
                        "memo": llm_results.get("memo", ""),
                        "routing_number": llm_results.get("routing_number", ""),
                        "account_number": llm_results.get("account_number", ""),
                        "check_number": llm_results.get("check_number", ""),
                        "raw_text": "",
                        "extraction_success": True,
                        "method": "vision_api"
                    },
                    "success": True,
                    "debug_info": {
                        "improved_ocr_success": False,
                        "llm_success": True,
                        "llm_available": True,
                        "regex_success": False,
                        "method_used": "vision_api_only"
                    }
                }
            else:
                logger.warning(f"Vision API processing failed: {llm_results.get('error', 'Unknown error')}")
                logger.info("Vision API failed - falling back to OCR and regex")
        except Exception as vision_error:
            logger.warning(f"Vision API processing failed: {str(vision_error)}")
            logger.info("Vision API error - falling back to OCR and regex")
    
    # Fallback to OCR and regex when LLM is not available or Vision API failed
    if not llm_available or not llm_service:
        logger.info("LLM service not available - Using OCR and regex extraction")
    
    logger.info("Attempting OCR with region detection...")
    try:
        improved_results = check_extractor.extract_check_fields(payload.imageDataUrl)
        logger.info(f"OCR processing completed. Success: {improved_results['extraction_success']}")
        
        if improved_results["extraction_success"]:
            logger.info("OCR extraction succeeded")
            
            return {
                "structured_data": {
                    "payee_name": improved_results.get("payee_name", ""),
                    "date": improved_results.get("date", ""),
                    "amount": improved_results.get("amount", ""),
                    "memo": improved_results.get("memo", ""),
                    "routing_no": improved_results.get("routing_no", ""),
                    "account_id": improved_results.get("account_id", ""),
                    "check_no": improved_results.get("check_no", ""),
                    "extraction_success": True,
                    "method": "improved_ocr_only"
                },
                "success": True,
                "debug_info": {
                    "improved_ocr_success": True,
                    "llm_success": False,
                    "regex_success": False,
                    "llm_available": llm_available,
                    "method_used": "improved_ocr_only"
                }
            }
        else:
            logger.warning("Check extraction failed")
            logger.info(f"Error: {improved_results.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"Complete OCR pipeline failure: {str(e)}")
        return {
            "raw_text": "",
            "structured_data": None,
            "success": False,
            "error": f"All OCR methods failed: {str(e)}",
            "debug_info": {
                "improved_ocr_success": False,
                "regex_success": False,
                "llm_available": llm_available,
                "complete_failure": True,
                "final_error": str(e)
            }
        }

@router.get("")
async def get_checks(user = Depends(get_current_user), db=Depends(get_db)):

    try:
        if (user['scope'] == 'customer'):
            return await get_my_checks_service(user['sub'], db)
        elif (user['scope'] == 'manager'):
            return await get_checks_service(db)
    except Exception as e:
        raise
    
    return HTTPException(status_code=403, detail="Forbidden")

@router.patch("/{check_id}", response_model=CheckInDB)
async def update_check(check_id: str, body: CheckUpdate, user = Depends(get_current_user), db=Depends(get_db)):

    try:
        if (user['scope'] == 'manager'):
            return await update_check_service(check_id, body, db)
    except Exception as e:
        raise

    return HTTPException(status_code=401, detail="Unauthorized")


