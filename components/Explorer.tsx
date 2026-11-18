'use client';
import { useState } from 'react';
import Link from 'next/link';
import { categories, topics } from '../lib/topics';
export default function Explorer() {
 const [category, setCategory] = useState('All topics'); const [search, setSearch] = useState('');
 const filtered = topics.filter(t => (category === 'All topics' || category === t.category) && `${t.title} ${t.summary} ${t.category}`.toLowerCase().includes(search.toLowerCase()));
 return <section id="library" className="library"><div className="section-heading"><div><div className="eyebrow">01 / THE KNOWLEDGE BASE</div><h2>Follow your curiosity.</h2></div><label className="search"><span aria-hidden="true">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the field guide" aria-label="Search topics" /></label></div><div className="filters" aria-label="Filter topics">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="cards" aria-live="polite">{filtered.map((t)=><Link className="card" key={t.slug} href={`/topics/${t.slug}/`}><div className={`card-art art-${t.number}`} aria-hidden="true"><span className="diagram-label">FIG. {t.number}</span><div className="diagram"><i/><i/><i/><i/><i/></div><span className="diagram-note">{t.number==='01'?'PREFERENCE → REPRESENTATION':t.number==='02'?'AUTHORITY ↔ ACCOUNTABILITY':t.number==='03'?'INDIVIDUAL → COLLECTIVE':'IDEA → IMPACT'}</span></div><div className="card-body"><div className="card-meta">{t.category}<span>{t.read} read</span></div><h3>{t.title} <span>↗</span></h3><p>{t.summary}</p></div></Link>)}</div>{!filtered.length&&<p className="empty">No topics found. Try another search or category.</p>}</section>;
}
