// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OntimeEntry, OntimeEvent, Rundown, SupportedEntry } from 'ontime-types';
import { act, createElement, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRundownQueryKey } from '../../api/constants';
import { putEditEntry } from '../../api/rundown';
import { useScopedEntryActions } from '../useEntryAction';

vi.mock('../../api/rundown', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/rundown')>()),
  putEditEntry: vi.fn(),
}));

function makeEvent(revision: number, title: string): OntimeEvent {
  return { id: 'event', type: SupportedEntry.Event, revision, title } as OntimeEvent;
}

function makeRundown(event: OntimeEvent): Rundown {
  return {
    id: 'rundown',
    title: 'Rundown',
    entries: { [event.id]: event },
    order: [event.id],
    flatOrder: [event.id],
    revision: 1,
  } as Rundown;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => Promise.resolve());
}

function EntryActionsReader({ onActions }: { onActions: (actions: ReturnType<typeof useScopedEntryActions>) => void }) {
  const actions = useScopedEntryActions('rundown');

  useEffect(() => {
    onActions(actions);
  }, [actions, onActions]);

  return null;
}

describe('useScopedEntryActions()', () => {
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

  it('keeps the newer optimistic edit when responses resolve out of order', async () => {
    const firstResponse = deferred<{ data: OntimeEntry }>();
    const secondResponse = deferred<{ data: OntimeEntry }>();
    vi.mocked(putEditEntry)
      .mockReturnValueOnce(firstResponse.promise as ReturnType<typeof putEditEntry>)
      .mockReturnValueOnce(secondResponse.promise as ReturnType<typeof putEditEntry>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(getRundownQueryKey('rundown'), makeRundown(makeEvent(1, 'original')));
    const container = document.createElement('div');
    root = createRoot(container);
    let actions: ReturnType<typeof useScopedEntryActions> | undefined;

    await act(async () => {
      root?.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(EntryActionsReader, { onActions: (value) => (actions = value) }),
        ),
      );
    });

    await act(async () => {
      void actions?.updateEntry({ id: 'event', title: 'first edit' });
      await Promise.resolve();
    });
    await act(async () => {
      void actions?.updateEntry({ id: 'event', title: 'second edit' });
      await Promise.resolve();
    });

    expect(queryClient.getQueryData<Rundown>(getRundownQueryKey('rundown'))?.entries.event).toMatchObject({
      title: 'second edit',
      revision: 3,
    });

    secondResponse.resolve({ data: makeEvent(3, 'second edit') });
    await flush();
    firstResponse.resolve({ data: makeEvent(2, 'first edit') });
    await flush();

    expect(queryClient.getQueryData<Rundown>(getRundownQueryKey('rundown'))?.entries.event).toMatchObject({
      title: 'second edit',
      revision: 3,
    });
  });
});
