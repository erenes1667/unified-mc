import type { Metadata } from 'next';
import './globals.css';
import Starfield from '@/components/starfield';
import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import AppWrapper from '@/components/app-wrapper';
import { loadRole, NAV_ITEMS } from '@/lib/roles';

export const metadata: Metadata = {
  title: 'Unified Mission Control',
  description: 'Unified Mission Control',
};

// Role is read server-side; default to emperor for Enes's machine
// In production, derive from session/cookie
async function getRole() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const roleId = process.env.UMC_ROLE || 'emperor';
    const filePath = path.join(process.cwd(), 'config', 'roles', `${roleId}.json`);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      role: 'emperor',
      label: 'Emperor',
      rateLimit: null,
      modelWaterfall: false,
      panels: NAV_ITEMS.map(n => n.id),
      theme: { accentLabel: 'imperial gold' },
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();

  return (
    <html lang="en">
      <body>
        <Starfield />
        <AppWrapper>
          <div className="app-shell">
            <Sidebar allowedPanels={role.panels} role={role.label} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Topbar />
              <main
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: 24,
                  position: 'relative',
                }}
              >
                {children}
              </main>
            </div>
          </div>
        </AppWrapper>
      </body>
    </html>
  );
}
