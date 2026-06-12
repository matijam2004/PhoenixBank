import { request } from "./http";

export const transactionsAPI = {
  getTransactionsByAccount: (customerId, accountId) => request(`/customers/${customerId}/accounts/${accountId}/transactions`),

  getTransactionsByCustomer: (customerId) => request(`/customers/${customerId}/transactions`),

  getTransactions: (filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    return request(`/transactions/?${params.toString()}`);
  },

  async postTransaction(payload, idempotencyKey = uuid()) {
    return request("/transactions/", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  },
};
