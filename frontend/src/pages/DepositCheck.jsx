// Check deposit with webcam capture and OCR processing
import Webcam from "react-webcam";
import { useCallback, useRef, useState } from "react";

import { useUser } from "../hooks/auth";
import { useCreateCheck, useChecks } from "../hooks/checks";

import { useAccounts } from "../hooks/accounts";
import { to_$ } from "../utils/numbers";
import { capitalize, maskId } from "../utils/strings";
import { INACTIVE_STATUS } from "../utils/accounts";

// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/deposit-check.css";
import { to_local, formatDateTime } from "../utils/dates";
import { request } from "../services/api/http";

function DepositCheck() {
  const webRef = useRef(null);

  const { data: accounts = [], isLoading: accLoading, error: accError } = useAccounts();
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: checks, isLoading: checksLoading, error: checksError } = useChecks();

  const [uploadForm, setUploadForm] = useState({
    frontCam: "",
    backCam: "",
    frontFile: "",
    backFile: "",
    method: "file", // file or camera
    account_id: "", // id of account to receive money
    amount: null, // expected amount
  });

  const [selectedSide, setSelectedSide] = useState("front");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // desconstructed uploadForm
  const { frontCam, backCam, frontFile, backFile, method, account_id, amount } = uploadForm;

  const useCreate = useCreateCheck(user?._id);

  const onUploadFormChange = (e) => {
    const { name, value } = e.target;

    setUploadForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFileChange = (e) => {
    const { name, files } = e.target;
    setUploadForm((prev) => ({ ...prev, [name]: files?.[0] ?? null }));
  };

  // Capture image from webcam
  const capture = useCallback(() => {
    const shot = webRef.current?.getScreenshot();
    if (!shot) return;

    setUploadForm((prev) => {
      if (selectedSide === "front") {
        setSelectedSide("back");
        return { ...prev, frontCam: shot };
      } else {
        return { ...prev, backCam: shot };
      }
    });
  }, [selectedSide]);

  // Process check image with OCR and LLM extraction
  const runOCR = useCallback(async () => {
    setError(null);
    setOcrText("");
    setStructuredData(null);
    setLoading(true);
    try {
      if (!uploadForm.frontCam) {
        setError("No front image to process. Please capture the front of the check first.");
        setLoading(false);
        return;
      }
      const data = await request("/checks/ocr", {
        method: "POST",
        body: JSON.stringify({ imageDataUrl: uploadForm.frontCam }),
      });

      if (data.structured_data) {
        console.log(data.structured_data);
        setStructuredData(data.structured_data);
      } else {
        console.log("Extraction failed");
      }

      if (!data.success) {
        setError(data.error || "LLM processing failed");
      }
    } catch (e) {
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  }, [frontCam]);

  function dataURLtoFile(dataURL, filename) {
    const [header, base64] = dataURL.split(",");
    const mime = header.match(/data:(.*);base64/)[1] || "application/octet-stream";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new File([bytes], filename, { type: mime });
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log(amount, account_id, frontFile, backFile);
    console.log(amount, account_id, frontCam, backCam);

    try {
      const front = method === "file" ? frontFile : dataURLtoFile(frontCam, "front.jpg");
      const back = method === "file" ? backFile : dataURLtoFile(backCam, "back.jpg");

      console.log(uploadForm);

      const fd = new FormData();
      fd.append("account_id", uploadForm.account_id);
      fd.append("amount", String(amount));
      fd.append("front", front);
      fd.append("back", back);

      console.log(Array.from(fd.entries()));

      const res = await useCreate.mutate(fd);

      console.log(res);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  function formComplete() {
    const hasFront = method === "file" ? frontFile instanceof File : !!frontCam;
    const hasBack = method === "file" ? backFile instanceof File : !!backCam;

    const validAccount = typeof account_id === "string" && account_id.trim().length > 0;
    const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;

    const ready = hasFront && hasBack && validAccount && validAmount;

    return !loading && ready;
  }

  const statusColor = (status) => {
    if (status === "pending") return "text-gray";
    if (status === "approved") return "text-success";

    return "text-danger";
  };

  const statusMessage = (status) => {
    if (status === "pending") return "This check is still pending. No further action needed.";
    if (status === "approved") return "This check was approved. Thank you!";

    return "This check was denied. If there was a mistake, please contact us.";
  };

  return (
    <>
      <div className="container deposit-checks-page" data-bs-theme="dark">
        <div className="row align-items-start">
          <form className="col-lg-6 offset-lg-1 me-lg-4 content component" id="check-upload" onSubmit={handleUploadSubmit}>
            <h1 className="page-title">Check Upload ({method})</h1>

            <section>
              <label htmlFor="account_id">Deposit to</label>
              <select className="form-select" name="account_id" value={uploadForm.account_id} onChange={onUploadFormChange} required>
                <option value="">Select account</option>
                {accounts?.map((a) => (
                  <option key={a._id} value={a._id} disabled={INACTIVE_STATUS.includes(a.status)}>
                    {capitalize(a.account_type)} ({maskId(a._id)}) - {to_$(a.balance)}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <label htmlFor="amount">Enter amount</label>
              <input className="form-control form-control-lg" value={amount} min={0.01} step={0.01} name="amount" type="number" placeholder="Amount" onChange={onUploadFormChange} required></input>
            </section>

            <section>
              <ul className="nav nav-tabs" id="methodTab" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link active"
                    id="file-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#file-tab-pane"
                    type="button"
                    role="tab"
                    aria-controls="file-tab-pane"
                    aria-selected={method === "file"}
                    onClick={() => setUploadForm((prev) => ({ ...prev, method: "file" }))}
                  >
                    <i className="bi bi-image"></i> File Upload
                  </button>
                </li>

                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="camera-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#camera-tab-pane"
                    type="button"
                    role="tab"
                    aria-controls="camera-tab-pane"
                    aria-selected={method === "camera"}
                    onClick={() => setUploadForm((prev) => ({ ...prev, method: "camera" }))}
                  >
                    <i className="bi bi-camera"></i> Camera Upload
                  </button>
                </li>
              </ul>

              <div className="tab-content" id="myTabContent">
                <div className="tab-pane fade show active" id="file-tab-pane" role="tabpanel" aria-labelledby="file-tab" tabIndex={0}>
                  <div className="mb-3">
                    <label htmlFor="frontFile" className="form-label fw-bold">
                      Front Image
                    </label>
                    <input className="form-control" type="file" id="frontFile" name="frontFile" accept="image/png, image/jpeg" onChange={onFileChange} />
                    <div className={`img-item back ${frontFile ? "set" : ""}`}>
                      {!frontFile && (
                        <span className="action-msg">
                          <i className="bi bi-card-image"></i> Select a file above
                        </span>
                      )}
                      {frontFile && <p className="label">{frontFile.name}</p>}
                      {frontFile && <img src={URL.createObjectURL(frontFile)} alt="Front preview" className="img-thumbnail mt-2" />}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="backFile" className="form-label fw-bold">
                      Back Image
                    </label>
                    <input className="form-control" type="file" id="backFile" name="backFile" accept="image/png, image/jpeg" onChange={onFileChange} />
                    <div className={`img-item back ${backFile ? "set" : ""}`}>
                      {!backFile && (
                        <span className="action-msg">
                          <i className="bi bi-card-image"></i> Select a file above
                        </span>
                      )}
                      {backFile && <p className="label">{backFile.name}</p>}
                      {backFile && <img src={URL.createObjectURL(backFile)} alt="Back preview" className="img-thumbnail mt-2" />}
                    </div>
                  </div>

                  <button className="btn btn-success" type="submit" disabled={!formComplete()}>
                    {loading ? <i className="spinner-grow" role="status"></i> : <i className="bi bi-upload"></i>}
                    {loading ? "Processing…" : "Upload"}
                  </button>
                </div>

                <div className="tab-pane fade" id="camera-tab-pane" role="tabpanel" aria-labelledby="camera-tab" tabIndex={0}>
                  {/* Webcam and capture controls */}
                  <div className="camera-panel">
                    <p className="info-title">Photo Tips</p>
                    <ul className="info-list">
                      <li>Make sure the check is laying flat on a dark, well-lit, non-reflective surface.</li>
                      <li>Keep the check within the camera's frame before capturing.</li>
                    </ul>
                    <div className="webcam-container">
                      <span className="label">Capturing {selectedSide}</span>
                      <Webcam
                        ref={webRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: { ideal: "environment" } }}
                        onUserMedia={() => setCameraReady(true)}
                        onUserMediaError={() => setError("Camera access denied or unavailable")}
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                      />
                    </div>

                    <div className="controls">
                      <div className="btn-group" role="group" aria-label="Select side">
                        <input type="radio" className="btn-check" name="side" id="frontCam-radio" autoComplete="off" checked={selectedSide === "front"} onChange={() => setSelectedSide("front")} />
                        <label className="btn btn-simple" htmlFor="frontCam-radio">
                          Front
                        </label>

                        <input type="radio" className="btn-check" name="side" id="backCam-radio" autoComplete="off" checked={selectedSide === "back"} onChange={() => setSelectedSide("back")} />
                        <label className="btn btn-simple" htmlFor="backCam-radio">
                          Back
                        </label>
                      </div>

                      <button className="btn btn-simple btn-blue" type="button" id="capture-btn" onClick={capture} disabled={!cameraReady}>
                        <i className="bi bi-camera"></i>
                        Capture Image
                      </button>
                    </div>

                    {/* Image previews panel */}
                    <div className="preview-panel">
                      <h2 className="header">Preview</h2>
                      <div className="image-item front">
                        <p className="label">Front</p>
                        {frontCam && <img className="check-img" src={frontCam} alt="Front of check" />}
                      </div>

                      <div className="image-item back">
                        <p className="label">Back</p>
                        {backCam && <img className="check-img" src={backCam} alt="Back of check" />}
                      </div>
                    </div>
                    <button className="btn btn-success" type="submit" disabled={!formComplete()}>
                      {loading ? <i className="spinner-grow" role="status"></i> : <i className="bi bi-upload"></i>}
                      {loading ? "Processing…" : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </form>

          <div className="col-lg-4 content component checks">
            <h3 className="title">Checks</h3>
            <div className="card-container">
              {checks?.length === 0 && (
                <div className="card empty">
                  <span className="text-gray text-center">You have no uploaded checks</span>
                </div>
              )}

              {checks?.map((c) => (
                <>
                  <div className="card">
                    <span className="date text-gray">{formatDateTime(c.created_at, "dt")}</span>
                    <span className="amount">
                      {to_$(c.amount)} <span className="account_id text-gray">to {maskId(c.account_id)}</span>
                    </span>
                    <span className={`status ${statusColor(c.status)}`}>{statusMessage(c.status)}</span>
                    <div className="front img-item">
                      <span className="label">front</span>
                      <img src={`data:${c.front.mime};base64,${c.front.data}`} alt="Front" />
                    </div>
                    <div className="back img-item">
                      <span className="label">back</span>
                      <img src={`data:${c.back.mime};base64,${c.back.data}`} alt="Front" />
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DepositCheck;
