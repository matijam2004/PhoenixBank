import { request, getAuthToken } from "./http";

export const authAPI = {
  signup: ({ email, password, ...rest }) =>
    request("/auth/register/customer", {
      method: "POST",
      body: JSON.stringify({ email, password, ...rest }),
    }),

  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: async () => {
    try {
      await request("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      // Clear sessionStorage for banking security
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_type");
      sessionStorage.removeItem("user_id");
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    return { ok: true };
  },

  getCurrentUser: () =>
    request("/auth/profile", {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }),

  forgotPassword: (email) =>
    request("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyResetToken: (token) =>
    request(`/auth/password/reset/verify/${token}`, {
      method: "GET",
    }),

  resetPassword: (token, newPassword) => {
    // Make request WITHOUT Authorization header
    // Password reset endpoint doesn't require auth - it uses token in body
    const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ?? "/api";

    return fetch(`${API_BASE_URL}/auth/password/reset/confirm`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, new_password: newPassword }),
    }).then(async (res) => {
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch { }

      if (!res.ok) {
        let detail = data && (data.detail ?? data.message);
        if (Array.isArray(detail)) {
          detail = detail
            .map((item) => {
              if (!item) return null;
              if (typeof item === "string") return item;
              return (
                item.msg || item.message || item.detail || JSON.stringify(item)
              );
            })
            .filter(Boolean)
            .join("; ");
        } else if (detail && typeof detail === "object") {
          detail =
            detail.msg ||
            detail.message ||
            detail.detail ||
            JSON.stringify(detail);
        }
        const msg = detail || res.statusText || "Request failed";
        throw new Error(String(msg));
      }

      return data;
    });
  },
};
