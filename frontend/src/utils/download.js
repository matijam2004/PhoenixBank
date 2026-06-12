/**
 * Reusable download utility functions
 */

/**
 * Downloads a file from a blob
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export const downloadFile = (blob, filename) => {
  console.log("Creating download link for:", filename);

  // Validate blob
  if (!blob || !(blob instanceof Blob)) {
    console.error("Invalid blob:", blob);
    throw new Error("Invalid blob provided for download");
  }

  // Verify blob type is not HTML
  if (blob.type && blob.type.includes("text/html")) {
    console.error("Blob is HTML type:", blob.type);
    throw new Error("Server returned HTML instead of a file. This usually means an error occurred.");
  }

  // Try using the File System Access API if available (modern browsers)
  if (window.showSaveFilePicker) {
    console.log("Using File System Access API...");
    window
      .showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: filename.endsWith(".pdf") ? "PDF Document" : "CSV File",
            accept: {
              [blob.type]: [filename.split(".").pop()],
            },
          },
        ],
      })
      .then(async (fileHandle) => {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log("File saved using File System Access API");
      })
      .catch((err) => {
        console.warn("File System Access API failed, falling back to link method:", err);
        // Fall through to link method
        downloadFileViaLink(blob, filename);
      });
    return;
  }

  // Fallback to link method
  downloadFileViaLink(blob, filename);
};

/**
 * Downloads a file using a link element
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
const downloadFileViaLink = (blob, filename) => {
  console.log("Using link download method...");

  // Create download link with proper attributes
  const url = URL.createObjectURL(blob);
  console.log("Created blob URL:", url.substring(0, 50) + "...");

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Critical: Set these attributes to force download
  link.setAttribute("download", filename);
  link.setAttribute("type", blob.type || "application/octet-stream");
  link.setAttribute("rel", "noopener");

  // Position off-screen but keep in DOM (some browsers need this)
  link.style.position = "fixed";
  link.style.top = "-1000px";
  link.style.left = "-1000px";
  link.style.opacity = "0";
  link.style.pointerEvents = "none";
  link.style.visibility = "hidden";
  link.target = "_blank";

  // Append to body
  document.body.appendChild(link);
  console.log("Triggering download...");

  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    // Focus the link first (helps some browsers)
    link.focus();

    // Create and dispatch a click event
    const clickEvent = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1,
    });

    link.dispatchEvent(clickEvent);

    // Also try direct click as fallback

    // commented out because ^ dispatchEvent already performs click event.
    // link.click();

    console.log("Download event dispatched");

    // Clean up after a longer delay to ensure download starts
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
      console.log("Cleaned up download link");
    }, 1000);
  });
};
