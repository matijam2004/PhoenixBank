import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { transactionsAPI } from "../services/api/transactions";

export function useTransactions(filters = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => transactionsAPI.getTransactions(filters),
    enabled,
    staleTime: 1000 * 30,
    keepPreviousData: true,
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useTransactionsByAccount(customerId, accountId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["transactions", accountId],
    queryFn: () => transactionsAPI.getTransactionsByAccount(customerId, accountId),
    enabled: enabled && Boolean(customerId && accountId),
    staleTime: 1000 * 30,
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useTransactionsByCustomer(customerId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["transactions", customerId],
    queryFn: () => transactionsAPI.getTransactionsByCustomer(customerId),
    enabled: enabled && Boolean(customerId),
    staleTime: 1000 * 30,
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateTransaction(customerId, accounts) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, idempotencyKey }) => {
      return transactionsAPI.postTransaction(payload, idempotencyKey);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["accounts"],
        exact: false,
        refetchType: "active",
      });

      for (const id of accounts) {
        qc.invalidateQueries({
          queryKey: ["account", id],
          exact: false,
          refetchType: "active",
        });
      }

      qc.invalidateQueries({
        queryKey: ["transactions", customerId],
        exact: false,
        refetchType: "active",
      });

      for (const id of accounts) {
        qc.invalidateQueries({
          queryKey: ["transactions", id],
          exact: false,
          refetchType: "active",
        });
      }

      alert("Transaction created");
    },
    onError: (error) => {
      console.error("Failed to create transaction:", error);

      alert(error.message ?? "Error creating transaction.");
    },
  });
}
