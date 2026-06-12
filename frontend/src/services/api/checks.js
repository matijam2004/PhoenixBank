import { request, upload } from "./http";

export const checksAPI = {
  /**
   * Get all checks (manager can see all, customer sees their own)
   */
  getChecks: () => request("/checks"),

  /**
   * Get a specific check by ID
   */
  getCheck: (checkId) => request(`/checks/${checkId}`),

  /**
   * Update a check by ID (manager only)
   */
  updateCheck: (checkId, updates) =>
    request(`/checks/${checkId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  /**
   * Upload check image
   */
  createCheck: (formData) => upload("/checks", formData),
};
