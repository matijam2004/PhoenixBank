import { request } from "./http";

export const customersAPI = {
  updateProfile: (profileData) =>
    request("/customers/me", {
      method: "PATCH",
      body: JSON.stringify(profileData),
    }),

  getProfile: () => request("/auth/profile"),
};



