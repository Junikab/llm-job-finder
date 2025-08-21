import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { listCVs, getCVFile, saveCV, removeCV } from './idb';
// Use same-origin by default so Vite can proxy /api to 5174 in dev
const API_BASE = ((import.meta.env?.VITE_API_BASE_URL) ?? '').trim();
export default function App() {
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState('Sydney NSW');
    const [days, setDays] = useState(14);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [searchUrls, setSearchUrls] = useState([]);
    const [tab, setTab] = useState('live');
    const [saved, setSaved] = useState([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [savedError, setSavedError] = useState(null);
    const [toast, setToast] = useState(null);
    // Recent CVs (IndexedDB)
    const [recent, setRecent] = useState([]);
    const [recentSelectedId, setRecentSelectedId] = useState('');
    // Live filters
    const [liveMinScore, setLiveMinScore] = useState(0);
    const [liveCompany, setLiveCompany] = useState('');
    const [liveLocation, setLiveLocation] = useState('');
    const [liveMaxDays, setLiveMaxDays] = useState('');
    const [sortByLive, setSortByLive] = useState('model');
    const canSubmit = useMemo(() => !!file && !loading, [file, loading]);
    function parseListedDays(text) {
        if (!text)
            return null;
        const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
        if (!m)
            return null;
        const n = Number(m[1]);
        const unit = m[2].toLowerCase();
        if (unit.startsWith('hour') || unit === 'h')
            return 0;
        if (unit.startsWith('week') || unit === 'w')
            return n * 7;
        return n;
    }
    const filteredLive = useMemo(() => {
        const comp = liveCompany.trim().toLowerCase();
        const locq = liveLocation.trim().toLowerCase();
        const arr = results.filter(r => {
            if (typeof liveMinScore === 'number' && liveMinScore > 0) {
                if (r.score == null || r.score < liveMinScore)
                    return false;
            }
            if (comp && !(r.company || '').toLowerCase().includes(comp))
                return false;
            if (locq && !(r.location || '').toLowerCase().includes(locq))
                return false;
            if (liveMaxDays !== '') {
                const d = parseListedDays(r.listedAgo);
                if (d != null && d > Number(liveMaxDays))
                    return false;
            }
            return true;
        });
        // sort
        const copy = [...arr];
        if (sortByLive === 'model') {
            copy.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
        }
        else if (sortByLive === 'recency') {
            const ad = (x) => {
                const d = parseListedDays(x.listedAgo);
                return d == null ? Infinity : d;
            };
            copy.sort((a, b) => ad(a) - ad(b)); // newest (fewest days) first
        }
        return copy;
    }, [results, liveMinScore, liveCompany, liveLocation, liveMaxDays, sortByLive]);
    async function onSubmit(e) {
        e.preventDefault();
        if (!file)
            return;
        setLoading(true);
        setError(null);
        setResults([]);
        try {
            const form = new FormData();
            form.append('cv', file);
            form.append('location', location);
            form.append('days', String(days));
            const res = await fetch(`${API_BASE}/api/jobs/find`, { method: 'POST', body: form });
            if (!res.ok)
                throw new Error(`Request failed: ${res.status}`);
            const json = await res.json();
            setAnalysis(json.analysis);
            setSearchUrls(json.searchUrls || []);
            setResults(json.results || []);
            // Save CV into IndexedDB (dedupe by name+size)
            try {
                const existing = await listCVs();
                const has = existing.some(m => m.name === file.name && m.size === file.size);
                if (!has)
                    await saveCV(file);
                setRecent(await listCVs());
            }
            catch { }
        }
        catch (err) {
            console.error(err);
            setError(err?.message || 'Something went wrong. Please try again.');
        }
        finally {
            setLoading(false);
        }
    }
    // Load recent CVs on mount
    useEffect(() => {
        (async () => {
            try {
                setRecent(await listCVs());
            }
            catch { }
        })();
    }, []);
    async function onFileChange(e) {
        const f = e.target.files?.[0] || null;
        setFile(f);
        if (f) {
            try {
                const existing = await listCVs();
                const has = existing.some(m => m.name === f.name && m.size === f.size);
                if (!has)
                    await saveCV(f);
                setRecent(await listCVs());
            }
            catch { }
        }
    }
    async function useSelectedRecent() {
        const id = parseInt(recentSelectedId, 10);
        if (!id)
            return;
        try {
            const f = await getCVFile(id);
            if (f)
                setFile(f);
        }
        catch { }
    }
    async function removeSelectedRecent() {
        const id = parseInt(recentSelectedId, 10);
        if (!id)
            return;
        try {
            await removeCV(id);
            setRecentSelectedId('');
            setRecent(await listCVs());
        }
        catch { }
    }
    return (_jsxs("div", { style: { fontFamily: 'ui-sans-serif, system-ui', padding: 16, maxWidth: 980, margin: '0 auto' }, children: [_jsx("h1", { style: { fontSize: 28, marginBottom: 8 }, children: "LLM Job Finder" }), _jsx("p", { style: { color: '#555', marginBottom: 16 }, children: "Upload your CV, we\u2019ll search Jora and rank roles using an LLM." }), _jsxs("div", { style: { display: 'flex', gap: 8, margin: '8px 0 16px' }, children: [_jsx("button", { type: "button", onClick: () => setTab('live'), style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'live' ? '#111' : '#f7f7f7', color: tab === 'live' ? '#fff' : '#111' }, children: "Live" }), _jsx("button", { type: "button", onClick: () => setTab('saved'), style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'saved' ? '#111' : '#f7f7f7', color: tab === 'saved' ? '#fff' : '#111' }, children: "Saved" })] }), tab === 'live' && (_jsxs(_Fragment, { children: [_jsxs("form", { onSubmit: onSubmit, style: { display: 'grid', gap: 12, alignItems: 'center', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }, children: [_jsxs("label", { style: { gridColumn: '1 / -1' }, children: [_jsx("div", { children: "CV (PDF/DOCX/TXT)" }), _jsx("input", { type: "file", accept: ".pdf,.docx,.txt", onChange: onFileChange })] }), _jsxs("div", { style: { gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { children: "Recent CVs" }), _jsxs("select", { value: recentSelectedId, onChange: e => setRecentSelectedId(e.target.value), children: [_jsx("option", { value: "", children: "Choose\u2026" }), recent.map(m => (_jsxs("option", { value: String(m.id), children: [m.name, " \u2022 ", (m.size / 1024).toFixed(0), " KB \u2022 ", new Date(m.addedAt).toLocaleString()] }, m.id)))] })] }), _jsx("button", { type: "button", onClick: useSelectedRecent, disabled: !recentSelectedId, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: recentSelectedId ? '#111' : '#ccc', color: '#fff' }, children: "Use selected" }), _jsx("button", { type: "button", onClick: removeSelectedRecent, disabled: !recentSelectedId, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }, children: "Remove" })] }), _jsxs("label", { children: [_jsx("div", { children: "Location" }), _jsx("input", { value: location, onChange: e => setLocation(e.target.value), placeholder: "Sydney NSW" })] }), _jsxs("label", { children: [_jsx("div", { children: "Listed within" }), _jsxs("select", { value: days, onChange: e => setDays(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "Last 24 hours" }), _jsx("option", { value: 7, children: "Last 7 days" }), _jsx("option", { value: 14, children: "Last 14 days" }), _jsx("option", { value: 30, children: "Last 30 days" })] })] }), _jsx("div", { style: { gridColumn: '1 / -1' }, children: _jsx("button", { disabled: !canSubmit, style: { padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', background: canSubmit ? '#111' : '#888', color: 'white' }, children: loading ? 'Finding…' : 'Find Jobs' }) }), !!error && (_jsx("div", { style: { gridColumn: '1 / -1', color: '#b00' }, children: error }))] }), !!analysis && (_jsxs("div", { style: { marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }, children: [_jsx("strong", { children: "Detected summary:" }), _jsx("div", { style: { color: '#333' }, children: analysis.summary }), _jsxs("div", { style: { marginTop: 6, color: '#555' }, children: [_jsx("strong", { children: "Titles:" }), " ", analysis.titles?.join(', ')] }), _jsxs("div", { style: { marginTop: 6, color: '#555' }, children: [_jsx("strong", { children: "Top skills:" }), " ", analysis.topSkills?.join(', ')] }), !!(searchUrls?.length) && (_jsxs("div", { style: { marginTop: 6 }, children: [_jsx("strong", { children: "Search URLs:" }), " ", searchUrls.map((u) => {
                                        try {
                                            const q = new URL(u).searchParams.get('q') || u;
                                            return (_jsx("a", { href: u, target: "_blank", style: { marginLeft: 8 }, children: q }, u));
                                        }
                                        catch {
                                            return null;
                                        }
                                    })] }))] })), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }, children: [_jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Min score" }), _jsx("input", { type: "number", min: 0, max: 100, value: liveMinScore, onChange: e => setLiveMinScore(Math.max(0, Math.min(100, Number(e.target.value)))), style: { width: 72 } })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Company" }), _jsx("input", { value: liveCompany, onChange: e => setLiveCompany(e.target.value), placeholder: "e.g. Atlassian" })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Location" }), _jsx("input", { value: liveLocation, onChange: e => setLiveLocation(e.target.value), placeholder: "e.g. Sydney" })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Days" }), _jsx("input", { type: "number", min: 0, max: 60, value: liveMaxDays, onChange: e => {
                                            const v = e.target.value;
                                            setLiveMaxDays(v === '' ? '' : Math.max(0, Math.min(60, Number(v))));
                                        }, style: { width: 72 } })] }), _jsx("button", { type: "button", onClick: () => { setLiveMinScore(0); setLiveCompany(''); setLiveLocation(''); setLiveMaxDays(''); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }, children: "Clear" }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }, children: [_jsx("span", { style: { color: '#333' }, children: "Sort by" }), _jsxs("select", { value: sortByLive, onChange: e => setSortByLive(e.target.value), children: [_jsx("option", { value: "model", children: "Model score" }), _jsx("option", { value: "recency", children: "Recency" })] })] })] }), _jsx("ol", { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }, children: filteredLive.map(r => (_jsxs("li", { style: { border: '1px solid #eee', borderRadius: 12, padding: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, children: [_jsx("a", { href: r.url, target: "_blank", style: { fontWeight: 600, color: '#0b5' }, children: r.title }), _jsxs("div", { style: { fontWeight: 700 }, children: [Math.round(r.score), "/100"] })] }), _jsxs("div", { style: { color: '#555', marginTop: 4 }, children: [r.company, " \u00B7 ", r.location, " \u00B7 ", r.listedAgo] }), _jsx("div", { style: { marginTop: 8, color: '#333' }, children: r.reason })] }, r.id))) }), !loading && filteredLive.length === 0 && (_jsx("div", { style: { marginTop: 16, color: '#666' }, children: "No results yet. Try adjusting location or days, or upload a different CV." }))] })), tab === 'saved' && (_jsx("div", { style: { marginTop: 8 }, children: _jsx(SavedList, { items: saved, loading: savedLoading, error: savedError, onRefresh: async () => {
                        setSavedLoading(true);
                        setSavedError(null);
                        try {
                            const res = await fetch(`${API_BASE}/api/db/jobs`);
                            if (!res.ok)
                                throw new Error(`Failed: ${res.status}`);
                            const json = await res.json();
                            setSaved(Array.isArray(json.results) ? json.results : []);
                        }
                        catch (err) {
                            setSavedError(err?.message || 'Failed to load saved jobs');
                        }
                        finally {
                            setSavedLoading(false);
                        }
                    }, onRate: async (jobId, nextScore) => {
                        // optimistic update with revert capture
                        let prevScore = null;
                        setSaved(prev => {
                            const found = prev.find(j => j.id === jobId);
                            prevScore = found?.userScore ?? null;
                            return prev.map(j => j.id === jobId ? { ...j, userScore: nextScore } : j);
                        });
                        try {
                            const res = await fetch(`${API_BASE}/api/db/feedback`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ jobId, userScore: nextScore })
                            });
                            if (!res.ok)
                                throw new Error(`Failed: ${res.status}`);
                            setToast('Saved');
                            setTimeout(() => setToast(null), 1600);
                            // refetch latest aggregate
                            try {
                                setSavedLoading(true);
                                const r2 = await fetch(`${API_BASE}/api/db/jobs`);
                                if (r2.ok) {
                                    const j2 = await r2.json();
                                    setSaved(Array.isArray(j2.results) ? j2.results : []);
                                }
                            }
                            finally {
                                setSavedLoading(false);
                            }
                        }
                        catch (err) {
                            setToast('Save failed');
                            setTimeout(() => setToast(null), 1600);
                            // revert
                            setSaved(prev => prev.map(j => j.id === jobId ? { ...j, userScore: prevScore } : j));
                        }
                    } }) })), !!toast && (_jsx("div", { style: { position: 'fixed', bottom: 16, right: 16, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8 }, children: toast }))] }));
}
function SavedList(props) {
    const { items, loading, error, onRefresh, onRate } = props;
    useEffect(() => { onRefresh(); /* fetch when mounted */ }, []);
    const [minScore, setMinScore] = useState(0);
    const [company, setCompany] = useState('');
    const [location, setLocation] = useState('');
    const [maxDays, setMaxDays] = useState('');
    const [sortBy, setSortBy] = useState('model');
    const [draftScores, setDraftScores] = useState({});
    function parseListedDays(text) {
        if (!text)
            return null;
        const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
        if (!m)
            return null;
        const n = Number(m[1]);
        const unit = m[2].toLowerCase();
        if (unit.startsWith('hour') || unit === 'h')
            return 0;
        if (unit.startsWith('week') || unit === 'w')
            return n * 7;
        return n;
    }
    const filtered = useMemo(() => {
        const comp = company.trim().toLowerCase();
        const loc = location.trim().toLowerCase();
        const arr = items.filter((j) => {
            // min model score
            if (typeof minScore === 'number' && minScore > 0) {
                if (j.modelScore == null || j.modelScore < minScore)
                    return false;
            }
            // company substring
            if (comp && !(j.company || '').toLowerCase().includes(comp))
                return false;
            // location (from nested data)
            if (loc) {
                const jl = (j.data?.location || '').toLowerCase();
                if (!jl.includes(loc))
                    return false;
            }
            // days filter (keep unknowns)
            if (maxDays !== '') {
                const d = parseListedDays(j.listedAgo);
                if (d != null && d > Number(maxDays))
                    return false;
            }
            return true;
        });
        const copy = [...arr];
        if (sortBy === 'model') {
            copy.sort((a, b) => (b.modelScore ?? -Infinity) - (a.modelScore ?? -Infinity));
        }
        else if (sortBy === 'user') {
            copy.sort((a, b) => (b.userScore ?? -Infinity) - (a.userScore ?? -Infinity));
        }
        else if (sortBy === 'recency') {
            const ad = (x) => {
                const d = parseListedDays(x.listedAgo);
                return d == null ? Infinity : d;
            };
            copy.sort((a, b) => ad(a) - ad(b));
        }
        return copy;
    }, [items, minScore, company, location, maxDays, sortBy]);
    const commitScore = (jobId) => {
        const current = draftScores[jobId];
        const job = items.find(j => j.id === jobId);
        if (current == null || !job || current === (job.userScore ?? 0)) {
            // nothing to do
            setDraftScores(prev => {
                if (prev[jobId] == null)
                    return prev;
                const { [jobId]: _omit, ...rest } = prev;
                return rest;
            });
            return;
        }
        onRate(jobId, current);
        setDraftScores(prev => {
            const { [jobId]: _omit, ...rest } = prev;
            return rest;
        });
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }, children: [_jsx("h2", { style: { fontSize: 18, margin: 0, color: '#333' }, children: "Saved" }), _jsx("button", { type: "button", onClick: () => onRefresh(), style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }, children: "Reload" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Min score" }), _jsx("input", { type: "number", min: 0, max: 100, value: minScore, onChange: e => setMinScore(Math.max(0, Math.min(100, Number(e.target.value)))), style: { width: 72 } })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Company" }), _jsx("input", { value: company, onChange: e => setCompany(e.target.value), placeholder: "e.g. Atlassian" })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Location" }), _jsx("input", { value: location, onChange: e => setLocation(e.target.value), placeholder: "e.g. Sydney" })] }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Listed within" }), _jsxs("select", { value: maxDays === '' ? '' : String(maxDays), onChange: e => {
                                            const v = e.target.value;
                                            setMaxDays(v === '' ? '' : Number(v));
                                        }, children: [_jsx("option", { value: "", children: "Any time" }), _jsx("option", { value: "1", children: "Last 24 hours" }), _jsx("option", { value: "7", children: "Last 7 days" }), _jsx("option", { value: "14", children: "Last 14 days" }), _jsx("option", { value: "30", children: "Last 30 days" })] })] }), _jsx("button", { type: "button", onClick: () => { setMinScore(0); setCompany(''); setLocation(''); setMaxDays(''); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }, children: "Clear" }), _jsxs("label", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("span", { style: { color: '#333' }, children: "Sort by" }), _jsxs("select", { value: sortBy, onChange: e => setSortBy(e.target.value), children: [_jsx("option", { value: "model", children: "Model score" }), _jsx("option", { value: "user", children: "Your score" }), _jsx("option", { value: "recency", children: "Recency" })] })] })] })] }), loading && _jsx("div", { style: { color: '#666' }, children: "Loading\u2026" }), !!error && _jsx("div", { style: { color: '#b00' }, children: error }), !loading && !error && filtered.length === 0 && _jsx("div", { style: { color: '#666' }, children: "No saved jobs yet." }), _jsx("ol", { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }, children: filtered.map(j => (_jsxs("li", { style: { border: '1px solid #eee', borderRadius: 12, padding: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, children: [j.url ? _jsx("a", { href: j.url, target: "_blank", style: { fontWeight: 600, color: '#0b5' }, children: j.title || j.id }) : _jsx("span", { style: { fontWeight: 600 }, children: j.title || j.id }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsxs("span", { title: "Model score", style: { color: '#333' }, children: ["Model: ", j.modelScore != null ? Math.round(j.modelScore) : '–'] }), _jsxs("span", { title: "Your score", style: { color: '#333' }, children: ["You: ", j.userScore != null ? Math.round(j.userScore) : '–'] })] })] }), _jsxs("div", { style: { color: '#555', marginTop: 4 }, children: [j.company || 'Unknown', " \u00B7 ", j.listedAgo || '—'] }), _jsx("div", { style: { marginTop: 8, display: 'grid', gap: 6 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { width: 70, color: '#333' }, children: "Rate:" }), _jsx("input", { type: "range", min: 0, max: 100, value: draftScores[j.id] ?? (j.userScore ?? 0), onChange: e => setDraftScores(prev => ({ ...prev, [j.id]: Number(e.target.value) })), onPointerUp: () => commitScore(j.id), onBlur: () => commitScore(j.id), style: { flex: 1 } }), _jsx("span", { style: { width: 36, textAlign: 'right', color: '#333' }, children: draftScores[j.id] ?? (j.userScore ?? 0) })] }) })] }, j.id))) })] }));
}
