import { request, getAuthToken } from "./http";
import { ensureUserIdFromToken } from "./utils";

export const accountsAPI = {
  getAccounts: async () => {
    const userId = ensureUserIdFromToken(getAuthToken());
    return request(`/customers/${userId}/accounts`);
  },

  getAccountsByPhone: (phone) => {
    return request(`/customers/phones/${phone}/accounts`);
  },

  getAccount: (accountId) => {
    return request(`/accounts/${accountId}`);
  },

  createAccount: (body) =>
    request(`/accounts/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateAccountStatus: (id, status) =>
    request(`/accounts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
