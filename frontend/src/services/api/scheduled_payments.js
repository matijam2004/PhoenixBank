import { request } from "./http";

export const scheduledPaymentsAPI = {
  // get
  getScheduledPaymentsByCustomer: (customerId) => request(`/customers/${customerId}/scheduled-payments`),

  // create
  async postScheduledPayment(payload) {
    return request("/scheduled-payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // update
  async updateScheduledPayment(scheduledPaymentId, payload) {
    return request(`/scheduled-payments/${scheduledPaymentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // delete
  async deleteScheduledPayment(scheduledPaymentId) {
    return request(`/scheduled-payments/${scheduledPaymentId}`, {
      method: "DELETE",
    });
  },
};
