import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checksAPI } from "../services/api/checks";

export function useCreateCheck(userId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (formData) => checksAPI.createCheck(formData),
    onSuccess: () => {
      alert("Upload success");
      qc.invalidateQueries({ queryKey: ["checks", userId] });
    },
  });
}

export function useChecks(userId) {
  return useQuery({
    queryKey: ["checks", userId],
    queryFn: checksAPI.getChecks,
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUpdateCheck(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => checksAPI.updateCheck(id, payload),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["checks", userId],
        exact: false,
        refetchType: "active",
      });

      alert("Check updated");
    },
    onError: (error) => {
      console.error("Failed to update check:", error);

      alert(error.message ?? "Error updating check.");
    },
  });
}
