'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/roles';

interface SidebarProps {
  allowedPanels: string[];
  role: string;
}

export default function Sidebar({ allowedPanels, role }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(item => allowedPanels.includes(item.id));
  // Split: main nav vs bottom (settings always last)
  const mainItems = visibleItems.filter(i => i.id !== 'settings');
  const bottomItems = visibleItems.filter(i => i.id === 'settings');

  return (
    <aside
      className="glass flex flex-col h-screen shrink-0"
      style={{
        width: 220,
        borderRight: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #c9a84c, #a07830)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 16px rgba(201,168,76,0.4)',
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>
            UNIFIED MC
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {role}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div style={{ fontSize: 9, color: '#6b7280', letterSpacing: 2, padding: '4px 10px 8px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {mainItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.id} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 cursor-pointer glass-hover ${isActive ? 'nav-item-active' : ''}`}
                style={{
                  border: '1px solid transparent',
                  color: isActive ? '#c9a84c' : '#9ca3af',
                  fontSize: 13,
                }}
              >
                <span className="nav-icon" style={{ fontSize: 15, width: 20, textAlign: 'center' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#c9a84c' }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Status indicator */}
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg"
          style={{ background: 'rgba(0,255,209,0.05)', border: '1px solid rgba(0,255,209,0.15)' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ffd1', boxShadow: '0 0 6px #00ffd1', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#00ffd1' }}>Gateway Connected</span>
        </div>
        {bottomItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.id} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer glass-hover ${isActive ? 'nav-item-active' : ''}`}
                style={{ border: '1px solid transparent', color: isActive ? '#c9a84c' : '#9ca3af', fontSize: 13 }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
