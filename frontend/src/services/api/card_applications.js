import { request } from "./http";

export const cardApplicationsAPI = {
  submit: (data) =>
    request("/card-applications/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMy: () => request("/card-applications/my"),

  getAll: (status) =>
    request(`/card-applications/${status ? `?status=${status}` : ""}`),

  getOne: (id) => request(`/card-applications/${id}`),

  approve: (id) =>
    request(`/card-applications/${id}/approve`, { method: "PATCH" }),

  reject: (id, reason = "") =>
    request(`/card-applications/${id}/reject?reason=${encodeURIComponent(reason)}`, {
      method: "PATCH",
    }),
};
