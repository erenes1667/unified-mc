export interface RoleConfig {
  role: string;
  label: string;
  rateLimit: number | null;
  modelWaterfall: boolean;
  panels: string[];
  theme: { accentLabel: string };
}

export const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: '💬', href: '/chat' },
  { id: 'tasks', label: 'Tasks', icon: '✅', href: '/tasks' },
  { id: 'team', label: 'Team', icon: '👥', href: '/team' },
  { id: 'memory', label: 'Memory', icon: '🧠', href: '/memory' },
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/calendar' },
  { id: 'activity', label: 'Activity', icon: '⚡', href: '/activity' },
  { id: 'projects', label: 'Projects', icon: '📁', href: '/projects' },
  { id: 'docs', label: 'Docs', icon: '📄', href: '/docs' },
  { id: 'email-ops', label: 'Email Ops', icon: '📧', href: '/email-ops' },
  { id: 'kde-metrics', label: 'KDE Metrics', icon: '📊', href: '/kde-metrics' },
  { id: 'usage', label: 'Usage', icon: '📈', href: '/usage' },
  { id: 'office', label: 'Office', icon: '🏢', href: '/office' },
  { id: 'radar', label: 'Radar', icon: '📡', href: '/radar' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔧', href: '/pipeline' },
  { id: 'directives', label: 'Directives', icon: '📋', href: '/directives' },
  { id: 'setup', label: 'Setup', icon: '⚙️', href: '/setup' },
  { id: 'cron', label: 'Cron', icon: '⏰', href: '/cron' },
  { id: 'clients', label: 'Clients', icon: '👥', href: '/clients' },
  { id: 'tools', label: 'Tools', icon: '🔧', href: '/tools' },
  { id: 'admin', label: 'Admin', icon: '🛡️', href: '/admin' },
  { id: 'settings', label: 'Settings', icon: '🔩', href: '/settings' },
];

// Default to emperor for Enes's local install
export async function loadRole(roleId = 'emperor'): Promise<RoleConfig> {
  try {
    const res = await fetch(`/api/role?id=${roleId}`);
    if (res.ok) return res.json();
  } catch {}
  // Fallback: emperor gets everything
  return {
    role: 'emperor',
    label: 'Emperor',
    rateLimit: null,
    modelWaterfall: false,
    panels: NAV_ITEMS.map(n => n.id),
    theme: { accentLabel: 'imperial gold' },
  };
}
