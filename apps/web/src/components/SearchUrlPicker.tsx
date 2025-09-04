import React from 'react';

export default function SearchUrlPicker(props: {
  selectValue: string;
  history: string[];
  customMode: boolean;
  searchUrl: string;
  onSelectChange: (value: string) => void;
  onChangeCustom: (value: string) => void;
  fullWidth?: boolean;
}) {
  const { selectValue, history, customMode, searchUrl, onSelectChange, onChangeCustom, fullWidth = true } = props;
  return (
    <>
    <div style={{ display: 'grid', gap: 8, alignItems: 'center' }}>
      <label style={{ color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span>URL picker </span>
          <span style={{ fontSize: '0.6em', color: '#334155', fontWeight: 600 }}>(optional)</span>
        </span>
        <select
          value={selectValue}
          onChange={e => onSelectChange(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', minWidth: 280 }}
        >
          <option value="">— None (auto-generate from CV) —</option>
          {history.map((u, i) => (
            <option key={i} value={u}>{u}</option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </label>
    </div>
      {customMode && (
        <label style={{ color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>Paste custom URL</span>
          <input
            value={searchUrl}
            onChange={e => onChangeCustom(e.target.value)}
            placeholder="the recent URL"
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', width: '100%' }}
          />
        </label>
      )}
    </>
  );
}
