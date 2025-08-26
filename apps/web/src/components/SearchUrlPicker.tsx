import React from 'react';

export default function SearchUrlPicker(props: {
  selectValue: string;
  history: string[];
  customMode: boolean;
  searchUrl: string;
  onSelectChange: (value: string) => void;
  onChangeCustom: (value: string) => void;
}) {
  const { selectValue, history, customMode, searchUrl, onSelectChange, onChangeCustom } = props;
  return (
    <>
      <label style={{ gridColumn: '1 / -1' }}>
        <div>Jora search URL (recent; optional)</div>
        <select
          value={selectValue}
          onChange={e => onSelectChange(e.target.value)}
        >
          <option value="">— None (auto-generate from CV) —</option>
          {history.map((u, i) => (
            <option key={i} value={u}>{u}</option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </label>
      {customMode && (
        <label style={{ gridColumn: '1 / -1' }}>
          <div>Paste custom Jora URL</div>
          <input
            value={searchUrl}
            onChange={e => onChangeCustom(e.target.value)}
            placeholder="https://au.jora.com/j?a=7d&disallow=true&l=NSW&q=Front+End+Developer&sp=facet_listed_date"
          />
        </label>
      )}
    </>
  );
}
