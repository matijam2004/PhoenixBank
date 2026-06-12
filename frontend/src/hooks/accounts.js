import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsAPI } from "../services/api/accounts";
import { cleanPhone } from "../utils/phone";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: accountsAPI.getAccounts,
    staleTime: 1000 * 30,
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useAccount(accountId) {
  return useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => accountsAPI.getAccount(accountId),
    staleTime: 1000 * 30,
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useAccountsByPhone(phone, { enabled = true } = {}) {
  phone = cleanPhone(phone);
  const isValidPhone = phone && phone.length === 10;

  return useQuery({
    queryKey: ["accounts_by_phone", phone],
    queryFn: async () => {
      if (!isValidPhone) return [];
      return accountsAPI.getAccountsByPhone(phone);
    },
    enabled: enabled && Boolean(phone),
  });
}

export function useUpdateAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => accountsAPI.updateAccountStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
