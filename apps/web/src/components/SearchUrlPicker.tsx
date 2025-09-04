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
  const { selectValue, history, customMode, searchUrl, onSelectChange, onChangeCustom } = props;
  return (
    <>
      <div className="lf-field">
        <label className="lf-label" htmlFor="lf-custom-url">Paste custom URL</label>
        <input
          id="lf-custom-url"
          className="lf-input"
          value={searchUrl}
          onChange={e => onChangeCustom(e.target.value)}
          placeholder="the recent URL"
        />
      </div>
      <div className="lf-field">
        <label className="lf-label" htmlFor="lf-url-picker">URL picker (optional)</label>
        <select
          id="lf-url-picker"
          className="lf-select"
          value={selectValue}
          onChange={e => onSelectChange(e.target.value)}
        >
          <option value="">— None (auto-generate from CV) —</option>
          {history.map((u, i) => (
            <option key={i} value={u}>{u}</option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </div>
    </>
  );
}
