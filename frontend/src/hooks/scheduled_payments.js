import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { scheduledPaymentsAPI } from "../services/api/scheduled_payments";

export function useScheduledPaymentsByCustomer(customerId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["scheduled_payments"],
    queryFn: () => scheduledPaymentsAPI.getScheduledPaymentsByCustomer(customerId),
    enabled: enabled && Boolean(customerId),
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUpdateScheduledPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => scheduledPaymentsAPI.updateScheduledPayment(id, payload),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["scheduled_payments"],
        exact: false,
        refetchType: "active",
      });

      alert("Scheduled payment updated");
    },
    onError: (error) => {
      console.error("Failed to update scheduled payment:", error);

      alert(error.message ?? "Error updating scheduled payment.");
    },
  });
}

export function useCreateScheduledPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload }) => {
      return scheduledPaymentsAPI.postScheduledPayment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["scheduled_payments"],
        exact: false,
        refetchType: "active",
      });

      alert("Scheduled payment created");
    },
    onError: (error) => {
      console.error("Failed to create scheduled payment:", error);

      alert(error.message ?? "Error creating scheduled payment.");
    },
  });
}

export function useDeleteScheduledPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      return scheduledPaymentsAPI.deleteScheduledPayment(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["scheduled_payments"],
        exact: false,
        refetchType: "active",
      });

      alert("Scheduled payment deleted");
    },
    onError: (error) => {
      console.error("Failed to delete scheduled payment:", error);

      alert(error.message ?? "Error deleting scheduled payment.");
    },
  });
}
