import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5174';

export default function App() {
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState('Sydney NSW');
    const [days, setDays] = useState(14);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [searchUrls, setSearchUrls] = useState([]);
    const canSubmit = useMemo(() => !!file && !loading, [file, loading]);
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
        }
        catch (err) {
            console.error(err);
            setError(err?.message || 'Something went wrong. Please try again.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { style: { fontFamily: 'ui-sans-serif, system-ui', padding: 16, maxWidth: 980, margin: '0 auto' }, children: [_jsx("h1", { style: { fontSize: 28, marginBottom: 8 }, children: "LLM Job Finder" }), _jsx("p", { style: { color: '#555', marginBottom: 16 }, children: "Upload your CV, we\u2019ll search Jora and rank roles using an LLM." }), _jsxs("form", { onSubmit: onSubmit, style: { display: 'grid', gap: 12, alignItems: 'center', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }, children: [_jsxs("label", { style: { gridColumn: '1 / -1' }, children: [_jsx("div", { children: "CV (PDF/DOCX/TXT)" }), _jsx("input", { type: "file", accept: ".pdf,.docx,.txt", onChange: e => setFile(e.target.files?.[0] || null) })] }), _jsxs("label", { children: [_jsx("div", { children: "Location" }), _jsx("input", { value: location, onChange: e => setLocation(e.target.value), placeholder: "Sydney NSW" })] }), _jsxs("label", { children: [_jsx("div", { children: "Listed within (days)" }), _jsx("input", { type: "number", min: 1, max: 60, value: days, onChange: e => setDays(Number(e.target.value)) })] }), _jsx("div", { style: { gridColumn: '1 / -1' }, children: _jsx("button", { disabled: !canSubmit, style: { padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', background: canSubmit ? '#111' : '#888', color: 'white' }, children: loading ? 'Finding…' : 'Find Jobs' }) }), !!error && (_jsx("div", { style: { gridColumn: '1 / -1', color: '#b00' }, children: error }))] }), !!analysis && (_jsxs("div", { style: { marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }, children: [_jsx("strong", { children: "Detected summary:" }), _jsx("div", { style: { color: '#333' }, children: analysis.summary }), _jsxs("div", { style: { marginTop: 6, color: '#555' }, children: [_jsx("strong", { children: "Titles:" }), " ", analysis.titles?.join(', ')] }), _jsxs("div", { style: { marginTop: 6, color: '#555' }, children: [_jsx("strong", { children: "Top skills:" }), " ", analysis.topSkills?.join(', ')] }), !!(searchUrls?.length) && (_jsxs("div", { style: { marginTop: 6 }, children: [_jsx("strong", { children: "Search URLs:" }), " ", searchUrls.map((u) => {
                                try {
                                    const q = new URL(u).searchParams.get('q') || u;
                                    return (_jsx("a", { href: u, target: "_blank", style: { marginLeft: 8 }, children: q }, u));
                                }
                                catch {
                                    return null;
                                }
                            })] }))] })), _jsx("ol", { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }, children: results.map(r => (_jsxs("li", { style: { border: '1px solid #eee', borderRadius: 12, padding: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, children: [_jsx("a", { href: r.url, target: "_blank", style: { fontWeight: 600, color: '#0b5' }, children: r.title }), _jsxs("div", { style: { fontWeight: 700 }, children: [Math.round(r.score), "/100"] })] }), _jsxs("div", { style: { color: '#555', marginTop: 4 }, children: [r.company, " \u00B7 ", r.location, " \u00B7 ", r.listedAgo] }), _jsx("div", { style: { marginTop: 8, color: '#333' }, children: r.reason })] }, r.id))) }), !loading && results.length === 0 && (_jsx("div", { style: { marginTop: 16, color: '#666' }, children: "No results yet. Try adjusting location or days, or upload a different CV." }))] }));
}
