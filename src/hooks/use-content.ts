import { useQuery } from '@tanstack/react-query';

import { authApi } from '@/lib/api/auth';
import { contentApi, DEFAULT_APP_RULES } from '@/lib/api/content';
import { queryKeys } from '@/lib/queries/keys';

const STATIC_CONTENT_STALE_MS = 1000 * 60 * 60;

export function useLanguages() {
  return useQuery({
    queryKey: queryKeys.languages,
    queryFn: ({ signal }) => authApi.getLanguages(signal),
    staleTime: STATIC_CONTENT_STALE_MS,
  });
}

export function useSupportInfo() {
  return useQuery({
    queryKey: queryKeys.support,
    queryFn: ({ signal }) => contentApi.getSupport(signal),
    staleTime: STATIC_CONTENT_STALE_MS,
  });
}

/** Server rules from GET /config, with the documented defaults until they load. */
export function useAppRules() {
  const query = useQuery({
    queryKey: queryKeys.rules,
    queryFn: ({ signal }) => contentApi.getRules(signal),
    staleTime: STATIC_CONTENT_STALE_MS,
  });
  return query.data ?? DEFAULT_APP_RULES;
}
