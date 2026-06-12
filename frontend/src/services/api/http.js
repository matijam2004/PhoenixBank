const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ?? "/api";

// We use sessionStorage rather than localStorage so tokens are automatically
// cleared when the browser tab closes. For a banking app that's the right default
// — a shared computer session shouldn't leave credentials sitting in localStorage.
export const getAuthToken = () => sessionStorage.getItem("access_token") || sessionStorage.getItem("token");

export async function request(path, { headers, ...opts } = {}) {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    credentials: opts?.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  return handleJsonResponse(res);
}

export async function upload(path, formData, opts = {}) {
  const token = getAuthToken();
  const { headers = {}, ...rest } = opts;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    method: rest.method || "POST",
    body: formData,
    credentials: rest.credentials || "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  return handleJsonResponse(res);
}

// Centralised response handler so every caller gets consistent error objects
// rather than raw fetch responses. Surfaces the backend's detail string when
// present so the UI can show a meaningful message instead of "Request failed".
export async function handleJsonResponse(res) {
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    let detail = data && (data.detail ?? data.message);
    if (Array.isArray(detail)) {
      detail = detail
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") return item;
          return item.msg || item.message || item.detail || JSON.stringify(item);
        })
        .filter(Boolean)
        .join("; ");
    } else if (detail && typeof detail === "object") {
      detail = detail.msg || detail.message || detail.detail || JSON.stringify(detail);
    }

    const msg = detail || res.statusText || "Request failed";
    throw new Error(String(msg));
  }

  return data;
}

// CSV and PDF handlers validate content-type before building a Blob because
// expired auth tokens cause the server to return an HTML error page. Without
// the check the download would silently succeed but produce a corrupt file.
export async function handleCsvResponse(res) {
  if (!res.ok) {
    let msg = "Failed to download CSV report";
    try {
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = JSON.parse(text);
        msg = json.detail || json.message || msg;
      } else if (contentType.includes("text/html")) {
        msg = `Server returned an HTML error page (${res.status}). The API endpoint may not exist or you may not be authenticated.`;
      } else {
        msg = `Server error (${res.status}): ${text.substring(0, 100)}`;
      }
    } catch {
      msg = `Server error (${res.status})`;
    }
    throw new Error(msg);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    const clonedRes = res.clone();
    const text = await clonedRes.text();
    console.error("Expected CSV but received:", contentType, text.substring(0, 500));
    throw new Error(`Server returned ${contentType} instead of CSV. This usually means the API endpoint returned an error.`);
  }

  if (!contentType.includes("text/csv") && !contentType.includes("text/plain")) {
    const clonedRes = res.clone();
    const text = await clonedRes.text();
    console.error("Unexpected content type for CSV:", contentType, text.substring(0, 200));
    throw new Error(`Unexpected content type: ${contentType}. Server may have returned an error page.`);
  }

  const blob = await res.blob();

  // A response can pass the Content-Type header check but still deliver an HTML
  // body — some proxies rewrite headers. This is the final safety net.
  if (blob.type && blob.type.includes("text/html")) {
    const text = await blob.text();
    console.error("Blob is HTML:", text.substring(0, 500));
    throw new Error("Server returned HTML instead of CSV file. Check your authentication and API endpoint.");
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : "report.csv";
  return { blob, filename };
}

// PDF handler — same content-type guard as the CSV handler above.
export async function handlePdfResponse(res) {
  if (!res.ok) {
    let msg = "Failed to download PDF report";
    try {
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = JSON.parse(text);
        msg = json.detail || json.message || msg;
      } else if (contentType.includes("text/html")) {
        msg = `Server returned an HTML error page (${res.status}). The API endpoint may not exist or you may not be authenticated.`;
      } else {
        msg = `Server error (${res.status}): ${text.substring(0, 100)}`;
      }
    } catch {
      msg = `Server error (${res.status})`;
    }
    throw new Error(msg);
  }

  // Verify content type before creating blob
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    // Clone the response to read it without consuming the original
    const clonedRes = res.clone();
    const text = await clonedRes.text();
    console.error("Expected PDF but received:", contentType, text.substring(0, 500));
    throw new Error(`Server returned ${contentType} instead of PDF. This usually means the API endpoint returned an error.`);
  }

  if (!contentType.includes("application/pdf")) {
    // Clone the response to read it without consuming the original
    const clonedRes = res.clone();
    const text = await clonedRes.text();
    console.error("Unexpected content type for PDF:", contentType, text.substring(0, 200));
    throw new Error(`Unexpected content type: ${contentType}. Server may have returned an error page.`);
  }

  const blob = await res.blob();

  // Final check: verify blob is not HTML
  if (blob.type && blob.type.includes("text/html")) {
    const text = await blob.text();
    console.error("Blob is HTML:", text.substring(0, 500));
    throw new Error("Server returned HTML instead of PDF file. Check your authentication and API endpoint.");
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : "report.pdf";
  return { blob, filename };
}
