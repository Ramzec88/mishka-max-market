'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLS = [
  { cmd: 'bold',          label: <strong>B</strong>,      title: 'Жирный (Ctrl+B)' },
  { cmd: 'italic',        label: <em>I</em>,              title: 'Курсив (Ctrl+I)' },
  { cmd: 'insertUnorderedList', label: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ), title: 'Маркированный список' },
  { cmd: 'insertOrderedList', label: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
      <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">1.</text>
      <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">2.</text>
      <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">3.</text>
    </svg>
  ), title: 'Нумерованный список' },
] as const;

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);

  // Sync external value → DOM only when it actually differs (avoids cursor jumping)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
      lastHtml.current = value;
    }
  }, [value]);

  function execCmd(cmd: string) {
    ref.current?.focus();
    document.execCommand(cmd, false);
    if (ref.current) {
      const html = ref.current.innerHTML;
      lastHtml.current = html;
      onChange(html);
    }
  }

  function handleInput() {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    if (html !== lastHtml.current) {
      lastHtml.current = html;
      onChange(html);
    }
  }

  const btnBase: React.CSSProperties = {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
    padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#333',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 30, height: 28, fontFamily: 'inherit',
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 8px',
        background: '#f9fafb', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap',
      }}>
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => { e.preventDefault(); execCmd(t.cmd); }}
            style={btnBase}
          >
            {t.label}
          </button>
        ))}
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />
        <button
          type="button"
          title="Убрать форматирование"
          onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }}
          style={{ ...btnBase, fontSize: 11, color: '#888' }}
        >
          Aa
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder || 'Введите описание товара…'}
        style={{
          minHeight: 120, padding: '10px 12px', fontSize: 14,
          lineHeight: 1.6, outline: 'none', color: '#1a1a1a',
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
        [contenteditable] ul { padding-left: 20px; margin: 4px 0; }
        [contenteditable] ol { padding-left: 20px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
        [contenteditable] p  { margin: 4px 0; }
      `}</style>
    </div>
  );
}
