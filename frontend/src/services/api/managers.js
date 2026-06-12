import { request } from "./http";

export const managersAPI = {
  getAllCustomers: () => request("/customers/"),

  getCustomer: (customerId) => request(`/customers/${customerId}`),

  updateCustomer: (customerId, updates) =>
    request(`/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  getCustomerAccounts: (customerId) =>
    request(`/customers/${customerId}/accounts`),

  getAccount: (accountId) => request(`/accounts/${accountId}`),

  getAllTransactions: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.set("start_date", params.start_date);
    if (params.end_date) queryParams.set("end_date", params.end_date);
    if (params.min_amount) queryParams.set("min_amount", params.min_amount);
    if (params.max_amount) queryParams.set("max_amount", params.max_amount);
    if (params.status) queryParams.set("status", params.status);
    if (params.limit) queryParams.set("limit", params.limit);
    if (params.skip) queryParams.set("skip", params.skip);
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.order) queryParams.set("order", params.order);

    const query = queryParams.toString();
    return request(`/transactions${query ? `?${query}` : ""}`);
  },

  getCustomerTransactions: (customerId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.set("start_date", params.start_date);
    if (params.end_date) queryParams.set("end_date", params.end_date);
    if (params.min_amount) queryParams.set("min_amount", params.min_amount);
    if (params.max_amount) queryParams.set("max_amount", params.max_amount);
    if (params.status) queryParams.set("status", params.status);
    if (params.limit) queryParams.set("limit", params.limit);
    if (params.skip) queryParams.set("skip", params.skip);

    const query = queryParams.toString();
    return request(
      `/customers/${customerId}/transactions${query ? `?${query}` : ""}`
    );
  },

  getAccountTransactions: (accountId, params = {}) => {
    // Unlike other transaction endpoints this one returns a flat list, not a paginated envelope.
    return request(`/accounts/${accountId}/transactions`);
  },

  updateAccount: (accountId, updates) =>
    request(`/accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  createAccount: (accountData) =>
    request("/accounts/", {
      method: "POST",
      body: JSON.stringify(accountData),
    }),
};

