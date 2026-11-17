import { createEffect, createMemo, createRoot, createSignal, latest, onCleanup } from '@solidjs/signals';
import { catalog, type AuctionItem } from './catalog';

type SearchResult =
  | { status: 'ready'; items: readonly AuctionItem[] }
  | { status: 'error' };

export type SearchSnapshot = { query: string } & (SearchResult | { status: 'pending' });

type LoadResults = (query: string, signal: AbortSignal) => Promise<readonly AuctionItem[]>;

export async function fetchCatalogResults(query: string, signal: AbortSignal) {
  const response = await fetch(`/api/catalog/search?${new URLSearchParams({ q: query })}`, { signal });
  if (!response.ok) throw new Error(`Catalog search returned HTTP ${response.status}`);

  const slugs: unknown = await response.json();
  if (!Array.isArray(slugs)) throw new Error('Invalid catalog search response');

  return slugs.map((slug: unknown) => {
    const item = catalog.find((candidate) => candidate.slug === slug);
    if (!item) throw new Error('Unknown catalog item in search response');
    return item;
  });
}

export function startCatalogSearch(
  initialQuery: string,
  publish: (snapshot: SearchSnapshot) => void,
  load: LoadResults = fetchCatalogResults,
) {
  return createRoot((dispose) => {
    const [request, setRequest] = createSignal({ query: initialQuery });
    const result = createMemo(async () => {
      const current = request();
      const controller = new AbortController();
      onCleanup(() => controller.abort());

      let outcome: SearchResult;
      try {
        outcome = { status: 'ready', items: await load(current.query, controller.signal) };
      } catch {
        outcome = { status: 'error' };
      }
      return { request: current, outcome };
    }, { loadingValue: undefined });

    createEffect((): SearchSnapshot => {
      const current = latest(request);
      const completed = latest(result);
      return completed?.request === current
        ? { query: current.query, ...completed.outcome }
        : { query: current.query, status: 'pending' };
    }, (snapshot) => { publish(snapshot); });

    return {
      search: (query: string) => setRequest({ query }),
      dispose,
    };
  });
}
