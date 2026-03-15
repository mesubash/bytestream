import { useAuthStore } from "@/store/use-auth";

export function useAuthHeaders() {
  const token = useAuthStore((state) => state.token);
  
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  };
}
