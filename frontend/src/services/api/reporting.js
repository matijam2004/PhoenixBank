// src/services/api/reporting.js
import { getAuthToken, handleCsvResponse, handlePdfResponse } from "./http";

const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ?? "/api";

export const reportingAPI = {
  /**
   * Download all transactions for a customer by customer_id, as CSV or PDF.
   * @param {"csv"|"pdf"} format
   * @param {string} customerId - The customer ID
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  downloadCustomerTransactions: async (format, customerId) => {
    const token = getAuthToken();
    if (!token) {
      console.error("No authentication token found");
      throw new Error("Not authenticated");
    }

    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    const endpoint =
      format === "pdf"
        ? `/reports/customers/${encodeURIComponent(customerId)}/transactions/pdf`
        : `/reports/customers/${encodeURIComponent(customerId)}/transactions`;

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Fetching from: ${fullUrl}`);
    console.log(`Format: ${format}, Customer ID: ${customerId}`);

    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: format === "pdf" ? "application/pdf" : "text/csv",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      redirect: "manual",
    });

    console.log(`Response status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);

    // Check for redirects
    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const location = res.headers.get("Location");
      console.error(`Redirect detected: ${location}`);
      throw new Error(
        `Server redirected to: ${location || "unknown location"}`
      );
    }

    // Check if response is OK before processing
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `Error response (${res.status}):`,
        text.substring(0, 500)
      );
      let errorMsg = `Failed to download file (${res.status})`;
      try {
        const json = JSON.parse(text);
        errorMsg = json.detail || json.message || errorMsg;
      } catch {
        if (text.includes("<html") || text.includes("<!DOCTYPE")) {
          errorMsg = `Server returned an HTML error page (${res.status}). Check your authentication and API endpoint.`;
          console.error("HTML error page detected");
        } else {
          errorMsg = text.substring(0, 200) || errorMsg;
        }
      }
      throw new Error(errorMsg);
    }

    // Verify content type BEFORE reading the response
    const contentType = res.headers.get("content-type") || "";
    if (format === "pdf" && !contentType.includes("application/pdf")) {
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      console.error("Expected PDF but got:", contentType);
      console.error("Response preview:", text.substring(0, 500));
      throw new Error(
        `Server returned incorrect content type: ${contentType}. Expected application/pdf.`
      );
    }
    if (
      format === "csv" &&
      !contentType.includes("text/csv") &&
      !contentType.includes("text/plain")
    ) {
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      console.error("Expected CSV but got:", contentType);
      console.error("Response preview:", text.substring(0, 500));
      throw new Error(
        `Server returned incorrect content type: ${contentType}. Expected text/csv.`
      );
    }

    console.log("Content type verified, processing response...");
    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },

  /**
   * Download all transactions for a customer by email, as CSV or PDF.
   * @param {"csv"|"pdf"} format
   * @param {string} email
   * @returns {Promise<{blob: Blob, filename: string}>}
   * @deprecated Use downloadCustomerTransactions with customer_id instead
   */
  downloadCustomerTransactionsByEmail: async (format, email) => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const trimmed = String(email || "").trim();
    if (!trimmed) throw new Error("Email is required");

    const endpoint =
      format === "pdf"
        ? `/reports/customers/${encodeURIComponent(trimmed)}/transactions/pdf`
        : `/reports/customers/${encodeURIComponent(trimmed)}/transactions`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: format === "pdf" ? "application/pdf" : "text/csv",
        Authorization: `Bearer ${token}`,
      },
    });

    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },

  /**
   * Download all transactions for the current logged-in customer, as CSV or PDF.
   * @param {"csv"|"pdf"} format
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  downloadMyTransactions: async (format = "csv") => {
    const token = getAuthToken();
    if (!token) {
      console.error("No authentication token found");
      throw new Error("Not authenticated");
    }

    const endpoint =
      format === "pdf"
        ? `/reports/me/transactions/pdf`
        : `/reports/me/transactions`;

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Fetching from: ${fullUrl}`);
    console.log(`Format: ${format}, Token: ${token.substring(0, 20)}...`);

    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: format === "pdf" ? "application/pdf" : "text/csv",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      redirect: "manual", // Prevent automatic redirects
    });

    console.log(`Response status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);

    // Check for redirects
    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const location = res.headers.get("Location");
      console.error(`Redirect detected: ${location}`);
      throw new Error(
        `Server redirected to: ${location || "unknown location"}`
      );
    }

    // Check if response is OK before processing
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `Error response (${res.status}):`,
        text.substring(0, 500)
      );
      let errorMsg = `Failed to download file (${res.status})`;
      try {
        const json = JSON.parse(text);
        errorMsg = json.detail || json.message || errorMsg;
      } catch {
        // If it's HTML, extract a meaningful error
        if (text.includes("<html") || text.includes("<!DOCTYPE")) {
          errorMsg = `Server returned an HTML error page (${res.status}). Check your authentication and API endpoint.`;
          console.error("HTML error page detected");
        } else {
          errorMsg = text.substring(0, 200) || errorMsg;
        }
      }
      throw new Error(errorMsg);
    }

    // Verify content type BEFORE reading the response
    const contentType = res.headers.get("content-type") || "";
    if (format === "pdf" && !contentType.includes("application/pdf")) {
      // Clone response to read error message
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      console.error("Expected PDF but got:", contentType);
      console.error("Response preview:", text.substring(0, 500));
      throw new Error(
        `Server returned incorrect content type: ${contentType}. Expected application/pdf.`
      );
    }
    if (
      format === "csv" &&
      !contentType.includes("text/csv") &&
      !contentType.includes("text/plain")
    ) {
      // Clone response to read error message
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      console.error("Expected CSV but got:", contentType);
      console.error("Response preview:", text.substring(0, 500));
      throw new Error(
        `Server returned incorrect content type: ${contentType}. Expected text/csv.`
      );
    }

    console.log("Content type verified, processing response...");
    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },

  /**
   * Example: account statement by account id and date range
   */
  downloadAccountStatement: async ({ accountId, from, to, format = "pdf" }) => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    if (!accountId) throw new Error("accountId is required");

    const query = new URLSearchParams();
    if (from) query.set("from", from); // ISO date
    if (to) query.set("to", to); // ISO date

    const endpoint =
      format === "pdf"
        ? `/reports/accounts/${accountId}/statement/pdf?${query.toString()}`
        : `/reports/accounts/${accountId}/statement?${query.toString()}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: format === "pdf" ? "application/pdf" : "text/csv",
        Authorization: `Bearer ${token}`,
      },
    });

    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },
};
