// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OntimeEntry, Rundown, SupportedEntry } from 'ontime-types';
import { act, createElement, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_RUNDOWN_QUERY_KEY, getRundownQueryKey } from '../../api/constants';
import { fetchCurrentRundown, fetchRundown } from '../../api/rundown';
import { flattenRundown, useRundownById } from '../useRundownById';

vi.mock('../../api/rundown', () => ({
  fetchCurrentRundown: vi.fn(),
  fetchRundown: vi.fn(),
}));

const entry = (id: string) => ({ id, type: SupportedEntry.Event, revision: 0 }) as OntimeEntry;

async function waitFor(condition: () => boolean) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (condition()) return;
    await act(async () => Promise.resolve());
  }
  throw new Error('Timed out waiting for condition');
}

function RundownReader({ rundownId, onRundownId }: { rundownId: string | null; onRundownId: (id: string) => void }) {
  const { data } = useRundownById(rundownId);

  useEffect(() => {
    onRundownId(data.id);
  }, [data.id, onRundownId]);

  return null;
}

describe('useRundownById', () => {
  let root: Root | undefined;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = undefined;
    }
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('moves bootstrap data into the selected rundown cache without a second fetch', async () => {
    const rundown = {
      id: 'loaded-rundown',
      title: 'Loaded',
      entries: {},
      order: [],
      flatOrder: [],
      revision: 1,
    } as Rundown;
    vi.mocked(fetchCurrentRundown).mockResolvedValue(rundown);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const container = document.createElement('div');
    const seenRundownIds: string[] = [];
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(RundownReader, { rundownId: null, onRundownId: (id) => seenRundownIds.push(id) }),
        ),
      );
    });

    await waitFor(() => queryClient.getQueryData(getRundownQueryKey(rundown.id)) === rundown);

    await act(async () => {
      root?.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(RundownReader, { rundownId: rundown.id, onRundownId: (id) => seenRundownIds.push(id) }),
        ),
      );
    });

    await waitFor(() => queryClient.getQueryData(CURRENT_RUNDOWN_QUERY_KEY) === undefined);

    expect(fetchCurrentRundown).toHaveBeenCalledOnce();
    expect(fetchRundown).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(getRundownQueryKey(rundown.id))).toBe(rundown);
    expect(seenRundownIds).toContain(rundown.id);
  });

  it('refetches an explicitly selected rundown when its cached data is stale', async () => {
    const cached = {
      id: 'background-rundown',
      title: 'Cached',
      entries: {},
      order: [],
      flatOrder: [],
      revision: 1,
    } as Rundown;
    const refreshed = { ...cached, title: 'Refreshed', revision: 2 };
    vi.mocked(fetchRundown).mockResolvedValue(refreshed);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(getRundownQueryKey(cached.id), cached);
    const container = document.createElement('div');
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(RundownReader, { rundownId: cached.id, onRundownId: () => {} }),
        ),
      );
    });

    await waitFor(
      () => queryClient.getQueryData<Rundown>(getRundownQueryKey(cached.id))?.revision === refreshed.revision,
    );

    expect(fetchRundown).toHaveBeenCalledWith(cached.id, expect.any(Object));
  });
});

describe('flattenRundown', () => {
  it('resolves the flat order into entries', () => {
    const rundown = { entries: { a: entry('a'), b: entry('b') }, flatOrder: ['a', 'b'] } as unknown as Rundown;
    expect(flattenRundown(rundown).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('flattens an empty rundown to nothing', () => {
    expect(flattenRundown({ entries: {}, flatOrder: [] })).toEqual([]);
  });

  it('skips ids which have no entry', () => {
    const rundown = { entries: { a: entry('a') }, flatOrder: ['a', 'missing'] } as unknown as Rundown;
    expect(flattenRundown(rundown).map((e) => e.id)).toEqual(['a']);
  });

  it('flattens an optimistic rundown, which carries revision -1', () => {
    const optimistic = { entries: { a: entry('a') }, flatOrder: ['a'], revision: -1 } as unknown as Rundown;
    expect(flattenRundown(optimistic).map((e) => e.id)).toEqual(['a']);
  });
});
