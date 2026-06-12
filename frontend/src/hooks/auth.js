import { useQuery } from "@tanstack/react-query";
import { authAPI } from "../services/api/auth";
import { getAuthToken } from "../services/api/http";

export function useUser() {
  // Check if there's a token - only make the request if token exists
  const token = getAuthToken();
  
  return useQuery({
    queryKey: ["user"],
    queryFn: authAPI.getCurrentUser,
    enabled: !!token, // Only run query if token exists
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => error?.status !== 401 && count < 2,
  });
}
