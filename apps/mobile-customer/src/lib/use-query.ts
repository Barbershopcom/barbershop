import { useCallback, useEffect, useState } from 'react';

interface UseQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>({
  queryFn,
  enabled = true,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await queryFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await fetchData();
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchData, refreshKey]);

  const refetch = useCallback(async () => {
    await fetchData();
    setRefreshKey((prev) => prev + 1);
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
