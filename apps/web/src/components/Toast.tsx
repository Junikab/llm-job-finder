import React from 'react';

export default function Toast(props: { message: string | null }) {
  const { message } = props;
  if (!message) return null;
  return (
    <div className="toast">
      {message}
    </div>
  );
}
