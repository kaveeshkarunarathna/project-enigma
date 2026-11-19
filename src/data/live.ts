import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * A tiny change signal. Every write bumps the version for its tables, and
 * `useLiveQuery` re-runs any query that reads one of them.
 */
export type Table = 'books' | 'sessions' | 'nights' | 'journal' | 'paths' | 'settings';

const versions: Record<Table, number> = {
  books: 0,
  sessions: 0,
  nights: 0,
  journal: 0,
  paths: 0,
  settings: 0,
};
const listeners = new Set<() => void>();

export function notifyChanged(...tables: Table[]) {
  for (const t of tables) versions[t]++;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(tables: Table[]) {
  return tables.map((t) => versions[t]).join('.');
}

export type LiveQuery<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void };

/**
 * Runs `query` and re-runs it whenever one of `tables` changes or `deps`
 * change. Results from stale runs are dropped.
 */
export function useLiveQuery<T>(query: () => Promise<T>, tables: Table[], deps: unknown[] = []): LiveQuery<T> {
  const key = tables.join(',');
  const version = useSyncExternalStore(subscribe, () => snapshot(tables));
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({
    data: undefined,
    error: undefined,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);
  const run = useRef(0);
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    const id = ++run.current;
    queryRef
      .current()
      .then((data) => {
        if (id === run.current) setState({ data, error: undefined, loading: false });
      })
      .catch((error: unknown) => {
        if (id === run.current) setState((s) => ({ data: s.data, error, loading: false }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, key, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
