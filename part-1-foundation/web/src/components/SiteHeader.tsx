import { type FormEvent, useState } from 'react';

export function SiteHeader({ initialQuery, onSearch }: {
  initialQuery: string;
  onSearch?: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (onSearch) {
      onSearch(next);
      return;
    }
    const params = new URLSearchParams();
    if (next) params.set('q', next);
    window.location.assign(`/search${params.size ? `?${params.toString()}` : ''}`);
  }
  return <header className="site-header"><div className="container header-main"><a className="brand" href="/" aria-label="Auction House home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Auction House</span></a><form className="search-form" role="search" onSubmit={search}><span className="search-icon" aria-hidden="true">⌕</span><input aria-label="Search auctions" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GPUs, memory, chassis, CPUs…" /><select aria-label="Search category" defaultValue="all"><option value="all">All equipment</option><option>GPUs</option><option>CPUs</option><option>Memory</option><option>Networking</option></select><button type="submit">Search</button></form><a className="sign-in" href="#sign-in"><span className="avatar">S</span><span>Sign in</span></a></div><nav className="container category-nav" aria-label="Equipment categories">{['Featured', 'GPUs', 'CPUs', 'Memory', 'Chassis', 'Networking', 'Cooling'].map((category) => <a key={category} href={`/search${category === 'Featured' ? '' : `?q=${category}`}`}>{category}</a>)}</nav></header>;
}
