import React from 'react';
import { useNotificationStore } from '../useNotificationStore';

export default function NotificationArea() {
  const { notifications, remove } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        margin: '1rem',
        zIndex: 1000,
      }}
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            marginBottom: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            backgroundColor: n.type === 'error' ? '#fdd' : '#ffd',
            color: '#000',
          }}
        >
          <span>{n.message}</span>
          <button
            onClick={() => remove(n.id)}
            style={{ marginLeft: '0.5rem' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
