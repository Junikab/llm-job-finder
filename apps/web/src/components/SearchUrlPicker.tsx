import React from 'react';

export default function SearchUrlPicker(props: {
  selectValue: string;
  history: string[];
  customMode: boolean;
  searchUrl: string;
  onSelectChange: (value: string) => void;
  onChangeCustom: (value: string) => void;
  fullWidth?: boolean;
  setCustomMode?: (v: boolean) => void;
}) {
  const { selectValue, history, customMode, searchUrl, onSelectChange, onChangeCustom, setCustomMode } = props;
  return (
    <>
      <div className="lf-field">
        <label className="lf-label" htmlFor="lf-custom-url">Paste custom URL</label>
        <input
          id="lf-custom-url"
          className="lf-input"
          value={customMode ? searchUrl : ''}
          onFocus={() => {
            // Enter custom mode and clear existing value to show placeholder
            if (!customMode) {
              setCustomMode?.(true);
              if (searchUrl) onChangeCustom('');
            }
          }}
          onInput={() => setCustomMode?.(true)}
          onChange={e => onChangeCustom(e.target.value)}
          placeholder="https://au.jora.com/"
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
