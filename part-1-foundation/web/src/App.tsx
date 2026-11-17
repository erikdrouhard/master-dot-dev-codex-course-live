import { useEffect, useRef, useState } from 'react';

import { catalog, formatCurrency } from './catalog';
import { startCatalogSearch, type SearchSnapshot } from './catalogSearch';
import { ProductArt } from './components/ProductArt';
import { ProductCard } from './components/ProductCard';
import { SiteHeader } from './components/SiteHeader';

function HomePage() {
  return <><section className="hero container"><div><p className="eyebrow">Compute deserves a second life</p><h1>Serious hardware.<br />Less serious prices.</h1><p>Bid on tested server equipment from data centers and operators across the country.</p><a className="hero-action" href="/search">Browse all auctions <span>→</span></a></div><div className="hero-rack" aria-hidden="true"><span className="rack-light one" /><span className="rack-light two" /><span className="rack-light three" /><div className="rack-unit"><b>GPU–08</b><i /><i /><i /><i /></div><div className="rack-unit"><b>CORE–96</b><i /><i /><i /><i /></div><div className="rack-unit"><b>MEM–1.5T</b><i /><i /><i /><i /></div></div></section><section className="catalog-section container"><div className="section-heading"><div><p className="eyebrow">Ending soon</p><h2>Equipment worth watching</h2></div><a href="/search">View all auctions <span>→</span></a></div><div className="product-grid">{catalog.map((item) => <ProductCard key={item.slug} item={item} />)}</div></section></>;
}

function SearchPage({ snapshot, retry }: { snapshot: SearchSnapshot; retry: () => void }) {
  const { query } = snapshot;
  return (
    <main className="search-page container" aria-busy={snapshot.status === 'pending'}>
      <div className="breadcrumbs"><a href="/">Home</a><span>/</span><span>Search</span></div>
      <div className="search-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{query ? `Results for “${query}”` : 'All auctions'}</h1>
          {snapshot.status === 'ready' && (
            <p role="status">{snapshot.items.length} sample {snapshot.items.length === 1 ? 'auction' : 'auctions'}</p>
          )}
        </div>
        <select aria-label="Sort auctions" defaultValue="ending"><option value="ending">Ending soonest</option><option>Price: low to high</option><option>Most bids</option></select>
      </div>
      {snapshot.status === 'pending' && <p role="status">Searching auctions…</p>}
      {snapshot.status === 'error' && (
        <div className="empty-state">
          <p role="alert">Search is temporarily unavailable.</p>
          <button type="button" onClick={retry}>Retry search</button>
        </div>
      )}
      {snapshot.status === 'ready' && (
        snapshot.items.length ? (
          <div className="product-grid search-results">
            {snapshot.items.map((item) => <ProductCard key={item.slug} item={item} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No equipment found</h2>
            <p>Try a broader term, like “GPU” or “memory.”</p>
            <a href="/search">View all auctions</a>
          </div>
        )
      )}
    </main>
  );
}

function ItemPage({ slug }: { slug: string }) {
  const item = catalog.find((candidate) => candidate.slug === slug); if (!item) return <main className="container empty-state"><h1>Auction not found</h1><a href="/">Back to Auction House</a></main>;
  return <main className="item-page container"><div className="breadcrumbs"><a href="/">Home</a><span>/</span><a href={`/search?q=${item.category}`}>{item.category}</a><span>/</span><span>{item.title}</span></div><div className="item-layout"><div className="item-gallery"><ProductArt kind={item.art} label={`Illustration of ${item.title}`} /><div className="thumbnail-row"><button className="selected"><ProductArt kind={item.art} label="Main view" /></button><button><span>+</span><small>More photos soon</small></button></div></div><section className="item-summary"><p className="product-category">{item.category} · {item.condition}</p><h1>{item.title}</h1><p className="item-kicker">{item.kicker}</p><div className="auction-panel"><div className="current-price"><span>Current bid</span><strong>{formatCurrency(item.currentPrice)}</strong><small>{item.bidCount} bids</small></div><div className="bidder"><span>Current bidder</span><strong>{item.currentBidder}</strong></div><div className="ending"><span>Time left</span><strong>{item.timeLeft}</strong></div><form className="bid-form" onSubmit={(event) => event.preventDefault()}><label htmlFor="bid">Your maximum bid</label><div><span>$</span><input id="bid" inputMode="decimal" placeholder={String(item.currentPrice + 100)} /><button>Place bid</button></div></form></div><div className="seller-card"><span className="seller-avatar">{item.seller.charAt(0)}</span><div><small>Sold by</small><strong>{item.seller}</strong><span>{item.sellerRating} · {item.location}</span></div></div></section></div><div className="item-details-grid"><section><p className="eyebrow">About this item</p><h2>The details</h2><p>{item.description}</p></section><section className="spec-list"><p className="eyebrow">Specifications</p>{item.specs.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section></div></main>;
}

export function App() {
  const path = window.location.pathname; const params = new URLSearchParams(window.location.search); const query = params.get('q') ?? '';
  useEffect(() => { document.title = path.startsWith('/items/') ? `${catalog.find((item) => path.endsWith(item.slug))?.title ?? 'Auction'} · Auction House` : 'Auction House'; }, [path]);
  if (path === '/search') return <SearchApp initialQuery={query} />;
  let page = <HomePage />; if (path.startsWith('/items/')) page = <ItemPage slug={decodeURIComponent(path.slice('/items/'.length))} />;
  return <div className="app-shell"><SiteHeader initialQuery={query} />{page}<footer><div className="container"><span>Auction House</span></div></footer></div>;
}

function SearchApp({ initialQuery }: { initialQuery: string }) {
  const [snapshot, setSnapshot] = useState<SearchSnapshot>({ query: initialQuery, status: 'pending' });
  const [header, setHeader] = useState({ query: initialQuery, revision: 0 });
  const session = useRef<ReturnType<typeof startCatalogSearch> | null>(null);

  useEffect(() => {
    const search = startCatalogSearch(initialQuery, setSnapshot);
    session.current = search;

    function restoreSearch() {
      const query = new URLSearchParams(window.location.search).get('q') ?? '';
      setHeader((previous) => ({ query, revision: previous.revision + 1 }));
      search.search(query);
    }

    window.addEventListener('popstate', restoreSearch);
    return () => {
      window.removeEventListener('popstate', restoreSearch);
      search.dispose();
      session.current = null;
    };
  }, [initialQuery]);

  function submit(query: string) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const url = `/search${params.size ? `?${params.toString()}` : ''}`;
    if (url !== window.location.pathname + window.location.search) history.pushState(null, '', url);
    session.current?.search(query);
  }

  return (
    <div className="app-shell">
      <SiteHeader key={header.revision} initialQuery={header.query} onSearch={submit} />
      <SearchPage snapshot={snapshot} retry={() => session.current?.search(snapshot.query)} />
      <footer><div className="container"><span>Auction House</span></div></footer>
    </div>
  );
}
