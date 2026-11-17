import { flush } from '@solidjs/signals';
import { expect, it, vi } from 'vitest';
import { catalog } from './catalog';
import { startCatalogSearch, type SearchSnapshot } from './catalogSearch';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

it('ignores a slow superseded result even when the loader ignores abort', async () => {
  const old = deferred<typeof catalog>();
  const next = deferred<typeof catalog>();
  const publish = vi.fn<(snapshot: SearchSnapshot) => void>();
  const signals: AbortSignal[] = [];

  const session = startCatalogSearch('GPU', publish, (query, signal) => {
    signals.push(signal);
    return query === 'GPU' ? old.promise : next.promise;
  });

  try {
    flush();
    expect(publish).toHaveBeenLastCalledWith({ query: 'GPU', status: 'pending' });

    session.search('Memory');
    flush();
    expect(signals[0]?.aborted).toBe(true);
    expect(publish).toHaveBeenLastCalledWith({ query: 'Memory', status: 'pending' });

    next.resolve([catalog[2]]);
    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith({
      query: 'Memory', status: 'ready', items: [catalog[2]],
    }));

    old.resolve([catalog[0]]);
    await old.promise;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(publish.mock.calls.map(([snapshot]) => snapshot.status)).toEqual(['pending', 'pending', 'ready']);

    session.search('Cooling');
    flush();
  } finally {
    session.dispose();
  }
  expect(signals[2]?.aborted).toBe(true);
});

it('retries the same query after a failure and distinguishes an empty result', async () => {
  const load = vi.fn()
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValueOnce([]);
  const publish = vi.fn<(snapshot: SearchSnapshot) => void>();
  const session = startCatalogSearch('unknown', publish, load);

  try {
    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith({ query: 'unknown', status: 'error' }));
    session.search('unknown');
    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith({ query: 'unknown', status: 'ready', items: [] }));
    expect(load).toHaveBeenCalledTimes(2);
  } finally {
    session.dispose();
  }
});
