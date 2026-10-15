import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

export function createApiQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status > 0 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}

