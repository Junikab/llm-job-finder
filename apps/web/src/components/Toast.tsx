import React from 'react';

export default function Toast(props: { message: string | null }) {
  const { message } = props;
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>
      {message}
    </div>
  );
}
