'use client';

import { useEffect, useState } from 'react';

export default function Topbar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }) + ' IST');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        (document.getElementById('umc-search') as HTMLInputElement)?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header
      className="glass flex items-center px-6 shrink-0"
      style={{
        height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: 16,
        borderRadius: 0,
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>
          UNIFIED MISSION CONTROL
        </span>
        <span style={{ fontSize: 10, color: '#6b7280' }}>v1.0</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <input
          id="umc-search"
          type="text"
          placeholder="Search panels, agents, docs... (⌘K)"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '6px 12px 6px 32px',
            fontSize: 12,
            color: '#9ca3af',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6b7280' }}>
          🔍
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Time */}
      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'inherit' }}>{time}</div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{
            padding: '5px 12px',
            background: 'rgba(0,255,209,0.08)',
            border: '1px solid rgba(0,255,209,0.2)',
            borderRadius: 6,
            fontSize: 11,
            color: '#00ffd1',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ⚡ Ping Agent
        </button>
        <button
          style={{
            width: 30,
            height: 30,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Pause agents"
        >
          ⏸
        </button>
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          boxShadow: '0 0 12px rgba(201,168,76,0.3)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title="Enes (Emperor)"
      >
        🐭
      </div>
    </header>
  );
}
