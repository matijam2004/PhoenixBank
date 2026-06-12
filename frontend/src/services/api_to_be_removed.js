// src/services/api.js  (or .ts if you prefer)
const API_BASE_URL = "/api";

const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function handleCsvResponse(res) {
  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch {
      try {
        msg = await res.text();
      } catch {}
    }
    throw new Error(msg || "Failed to download report");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i
  );
  const filename = match ? decodeURIComponent(match[1]) : "transactions.csv";
  return { blob, filename };
}

async function handlePdfResponse(res) {
  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch {
      try {
        msg = await res.text();
      } catch {}
    }
    throw new Error(msg || "Failed to download PDF report");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i
  );
  const filename = match ? decodeURIComponent(match[1]) : "transactions.pdf";
  return { blob, filename };
}

export const authAPI = {
  signup: async ({ email, password, ...rest }) => {
    const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...rest }),
    });
    await handleResponse(regRes);

    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(loginRes);

    localStorage.setItem("access_token", data.access_token);

    const payload = parseJwt(data.access_token) || {};
    if (payload.sub) localStorage.setItem("user_id", payload.sub);
    if (payload.scope) localStorage.setItem("user_type", payload.scope);

    return { ...data, user_id: payload.sub, user_type: payload.scope };
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    localStorage.setItem("access_token", data.access_token);

    const payload = parseJwt(data.access_token) || {};
    if (payload.sub) localStorage.setItem("user_id", payload.sub);
    if (payload.scope) localStorage.setItem("user_type", payload.scope);

    return { ...data, user_id: payload.sub, user_type: payload.scope };
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_type");
  },

  getCurrentUser: async () => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const payload = parseJwt(token);
    if (!payload) throw new Error("Invalid token");
    return { user_id: payload.sub, user_type: payload.scope, token };
  },
};

export const accountAPI = {
  createAccount: async (accountData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/accounts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(accountData),
    });
    return handleResponse(res);
  },

  getAccounts: async () => {
    const token = getAuthToken();
    const payload = token ? parseJwt(token) : null;
    if (!payload?.sub) throw new Error("Missing user id; login again");

    const res = await fetch(
      `${API_BASE_URL}/accounts/by-customer/${payload.sub}`,
      {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
    return handleResponse(res);
  },

  getAccount: async (accountId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return handleResponse(res);
  },

  updateAccountStatus: async (accountId, status) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },
};

export const transactionAPI = {
  createTransaction: async (transactionData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/transactions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(transactionData),
    });
    return handleResponse(res);
  },

  getTransactions: async (accountId) => {
    if (!accountId) throw new Error("accountId is required");
    const token = getAuthToken();
    const res = await fetch(
      `${API_BASE_URL}/transactions/by-account/${accountId}`,
      {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
    return handleResponse(res);
  },

  getTransaction: async (transactionId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return handleResponse(res);
  },
};

export const reportingAPI = {
  downloadMyTransactions: async (format = "csv") => {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const endpoint =
      format === "pdf"
        ? "/reports/me/transactions/pdf"
        : "/reports/me/transactions";
    const acceptHeader = format === "pdf" ? "application/pdf" : "text/csv";

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: acceptHeader,
        Authorization: `Bearer ${token}`,
      },
    });

    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },

  downloadCustomerTransactions: async (customerId, format = "csv") => {
    if (!customerId) throw new Error("Customer ID is required");
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const trimmed = customerId.trim();
    if (!trimmed) throw new Error("Customer ID is required");

    const endpoint =
      format === "pdf"
        ? `/reports/customers/${trimmed}/transactions/pdf`
        : `/reports/customers/${trimmed}/transactions`;
    const acceptHeader = format === "pdf" ? "application/pdf" : "text/csv";

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: acceptHeader,
        Authorization: `Bearer ${token}`,
      },
    });

    return format === "pdf" ? handlePdfResponse(res) : handleCsvResponse(res);
  },
};
