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
      <label style={{ gridColumn: fullWidth ? '1 / -1' as any : undefined }}>
        <div>Jora search URL (recent; optional)</div>
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
      {customMode && (
        <label style={{ gridColumn: fullWidth ? '1 / -1' as any : undefined }}>
          <div>Paste custom Jora URL</div>
          <input
            value={searchUrl}
            onChange={e => onChangeCustom(e.target.value)}
            placeholder="https://au.jora.com/j?a=7d&disallow=true&l=NSW&q=Front+End+Developer&sp=facet_listed_date"
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', width: '100%' }}
          />
        </label>
      )}
    </>
  );
}
