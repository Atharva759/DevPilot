"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useRepoHealth(repoId: string | null) {
  return useQuery({
    queryKey: queryKeys.health.repo(repoId ?? ""),
    queryFn: () => api.getRepoHealth(repoId!),
    enabled: Boolean(repoId),
  });
}
