'use client'

import { useState, useEffect } from 'react'
import { useMissionControl } from '@/store'

// ─── Role types ───────────────────────────────────────────────────────────────
interface RoleConfig {
  id: string
  label: string
  emoji: string
  description: string
  panels: string[]
}

// ─── Panel registry ───────────────────────────────────────────────────────────
interface PanelDef {
  id: string
  label: string
  icon: React.ReactNode
  group: string
}

const ALL_PANELS: PanelDef[] = [
  // Core
  { id: 'overview',         label: 'Overview',          icon: <OverviewIcon />,        group: 'core' },
  { id: 'agents',           label: 'Agents',            icon: <AgentsIcon />,           group: 'core' },
  { id: 'tasks',            label: 'Tasks',             icon: <TasksIcon />,            group: 'core' },
  { id: 'sessions',         label: 'Sessions',          icon: <SessionsIcon />,         group: 'core' },
  { id: 'notifications',    label: 'Notifications',     icon: <BellIcon />,             group: 'core' },
  { id: 'standup',          label: 'Standup',           icon: <StandupIcon />,          group: 'core' },
  // Observe
  { id: 'activity',         label: 'Activity',          icon: <ActivityIcon />,         group: 'observe' },
  { id: 'fleet',            label: 'Fleet',             icon: <FleetIcon />,            group: 'observe' },
  { id: 'cost-analytics',   label: 'Cost Analytics',    icon: <CostAnalyticsIcon />,    group: 'observe' },
  { id: 'logs',             label: 'Logs',              icon: <LogsIcon />,             group: 'observe' },
  { id: 'tokens',           label: 'Tokens',            icon: <TokensIcon />,           group: 'observe' },
  { id: 'agent-costs',      label: 'Agent Costs',       icon: <AgentCostsIcon />,       group: 'observe' },
  { id: 'memory',           label: 'Memory',            icon: <MemoryIcon />,           group: 'observe' },
  // Automate
  { id: 'cron',             label: 'Cron',              icon: <CronIcon />,             group: 'automate' },
  { id: 'spawn',            label: 'Spawn',             icon: <SpawnIcon />,            group: 'automate' },
  { id: 'webhooks',         label: 'Webhooks',          icon: <WebhookIcon />,          group: 'automate' },
  { id: 'alerts',           label: 'Alerts',            icon: <AlertIcon />,            group: 'automate' },
  { id: 'github',           label: 'GitHub',            icon: <GitHubIcon />,           group: 'automate' },
  { id: 'pipeline-builder', label: 'Pipeline',          icon: <PipelineIcon />,         group: 'automate' },
  // Admin
  { id: 'users',            label: 'Users',             icon: <UsersIcon />,            group: 'admin' },
  { id: 'audit',            label: 'Audit',             icon: <AuditIcon />,            group: 'admin' },
  { id: 'history',          label: 'History',           icon: <HistoryIcon />,          group: 'admin' },
  { id: 'gateways',         label: 'Gateways',          icon: <GatewaysIcon />,         group: 'admin' },
  { id: 'gateway-config',   label: 'Config',            icon: <GatewayConfigIcon />,    group: 'admin' },
  { id: 'integrations',     label: 'Integrations',      icon: <IntegrationsIcon />,     group: 'admin' },
  { id: 'super-admin',      label: 'Super Admin',       icon: <SuperAdminIcon />,       group: 'admin' },
  { id: 'settings',         label: 'Settings',          icon: <SettingsIcon />,         group: 'admin' },
]

const GROUP_ORDER = ['core', 'observe', 'automate', 'admin']
const GROUP_LABELS: Record<string, string> = {
  core: undefined as unknown as string,
  observe: 'OBSERVE',
  automate: 'AUTOMATE',
  admin: 'ADMIN',
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  emperor: { id: 'emperor', label: 'Emperor', emoji: '👑', description: 'Full access', panels: ALL_PANELS.map(p => p.id) },
  marketing: { id: 'marketing', label: 'Marketing', emoji: '📣', description: 'Chat + Ops', panels: ['overview','tasks','activity','agents','notifications','standup'] },
  dev: { id: 'dev', label: 'Developer', emoji: '🔨', description: 'Dev panels', panels: ['overview','agents','tasks','sessions','activity','logs','memory','cron','spawn','webhooks','github','pipeline-builder','settings','notifications'] },
  admin: { id: 'admin', label: 'Admin', emoji: '🛡️', description: 'Fleet + Usage', panels: ['overview','fleet','cost-analytics','tokens','agent-costs','users','audit','gateways','gateway-config','settings','notifications'] },
}

// ─── Main Sidebar component ───────────────────────────────────────────────────
export function Sidebar() {
  const { activeTab, setActiveTab, connection, sidebarExpanded, collapsedGroups, toggleSidebar, toggleGroup } = useMissionControl()
  const [currentRole, setCurrentRole] = useState<string>('emperor')
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  // Load role from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mc-role')
    if (saved && ROLE_CONFIGS[saved]) setCurrentRole(saved)
  }, [])

  function switchRole(roleId: string) {
    setCurrentRole(roleId)
    localStorage.setItem('mc-role', roleId)
    setRoleMenuOpen(false)
    // If active tab not in new role, switch to overview
    if (!ROLE_CONFIGS[roleId]?.panels.includes(activeTab)) {
      setActiveTab('overview')
    }
  }

  const role = ROLE_CONFIGS[currentRole] ?? ROLE_CONFIGS.emperor
  const allowedPanels = new Set(role.panels)

  // Build grouped panels
  const groups = GROUP_ORDER.map(groupId => ({
    id: groupId,
    label: GROUP_LABELS[groupId],
    items: ALL_PANELS.filter(p => p.group === groupId && allowedPanels.has(p.id)),
  })).filter(g => g.items.length > 0)

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.key === '[' && !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSidebar])

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`hidden md:flex flex-col shrink-0 transition-all duration-200 ease-in-out border-r relative z-10 ${
          sidebarExpanded ? 'w-[220px]' : 'w-14'
        }`}
        style={{
          background: 'rgba(10, 10, 20, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Header: Logo + toggle */}
        <div className={`flex items-center shrink-0 ${sidebarExpanded ? 'px-3 py-3 gap-2.5' : 'flex-col py-3 gap-2'}`}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))',
              border: '1px solid rgba(201,168,76,0.4)',
              boxShadow: '0 0 12px rgba(201,168,76,0.2)',
            }}
          >
            <span style={{ color: '#c9a84c' }} className="font-bold text-xs">MC</span>
          </div>
          {sidebarExpanded && (
            <span className="text-sm font-semibold truncate flex-1" style={{ color: '#c9a84c' }}>
              Mission Control
            </span>
          )}
          <button
            onClick={toggleSidebar}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              {sidebarExpanded ? (
                <polyline points="10,3 5,8 10,13" />
              ) : (
                <polyline points="6,3 11,8 6,13" />
              )}
            </svg>
          </button>
        </div>

        {/* Role badge (expanded) / icon (collapsed) */}
        <div className={`relative shrink-0 ${sidebarExpanded ? 'px-3 pb-2' : 'flex justify-center pb-2'}`}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className={`flex items-center gap-2 rounded-md transition-smooth ${
              sidebarExpanded ? 'w-full px-2 py-1.5' : 'w-10 h-8 justify-center'
            }`}
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
            title={`Role: ${role.label}`}
          >
            <span className="text-sm">{role.emoji}</span>
            {sidebarExpanded && (
              <>
                <span className="text-xs font-medium" style={{ color: '#c9a84c' }}>{role.label}</span>
                <svg className="w-3 h-3 ml-auto text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="4,6 8,10 12,6" />
                </svg>
              </>
            )}
          </button>

          {/* Role dropdown */}
          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
              <div
                className={`absolute z-50 w-44 rounded-lg py-1 shadow-xl ${sidebarExpanded ? 'left-3 top-full mt-1' : 'left-full ml-2 top-0'}`}
                style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
              >
                {Object.values(ROLE_CONFIGS).map(r => (
                  <button
                    key={r.id}
                    onClick={() => switchRole(r.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-smooth ${
                      r.id === currentRole ? 'text-yellow-400' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={r.id === currentRole ? { background: 'rgba(201,168,76,0.1)' } : {}}
                  >
                    <span>{r.emoji}</span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground/60 text-2xs">{r.description}</span>
                    </div>
                    {r.id === currentRole && (
                      <svg className="w-3 h-3 ml-auto" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,8 7,12 13,4" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className={`shrink-0 mb-1 ${sidebarExpanded ? 'mx-3' : 'mx-2'}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Nav groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* Divider between groups (not before first) */}
              {groupIndex > 0 && (
                <div className={`my-1.5 ${sidebarExpanded ? 'mx-3' : 'mx-2'}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
              )}

              {/* Group header */}
              {sidebarExpanded && group.label && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 mt-3 mb-1 group/header"
                >
                  <span className="text-[10px] tracking-widest font-semibold select-none" style={{ color: 'rgba(201,168,76,0.5)' }}>
                    {group.label}
                  </span>
                  <svg
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-150 ${
                      collapsedGroups.includes(group.id) ? '-rotate-90' : ''
                    }`}
                  >
                    <polyline points="4,6 8,10 12,6" />
                  </svg>
                </button>
              )}

              {/* Group items */}
              <div
                className={`overflow-hidden transition-all duration-150 ease-in-out ${
                  sidebarExpanded && collapsedGroups.includes(group.id) ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                }`}
              >
                <div className={`flex flex-col ${sidebarExpanded ? 'gap-0.5 px-2' : 'items-center gap-1'}`}>
                  {group.items.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      active={activeTab === item.id}
                      expanded={sidebarExpanded}
                      onClick={() => setActiveTab(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Connection indicator */}
        <div className={`shrink-0 py-3 flex ${sidebarExpanded ? 'px-3 items-center gap-2' : 'flex-col items-center'}`}
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              connection.isConnected ? 'pulse-dot' : ''
            }`}
            style={{ background: connection.isConnected ? '#00ffd1' : '#ff4444' }}
            title={connection.isConnected ? 'Gateway connected' : 'Gateway disconnected'}
          />
          {sidebarExpanded && (
            <span className="text-xs truncate" style={{ color: connection.isConnected ? '#00ffd1' : '#ff4444' }}>
              {connection.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <MobileBottomBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allPanels={ALL_PANELS.filter(p => allowedPanels.has(p.id))}
      />
    </>
  )
}

// ─── NavButton ─────────────────────────────────────────────────────────────────
function NavButton({ item, active, expanded, onClick }: {
  item: PanelDef
  active: boolean
  expanded: boolean
  onClick: () => void
}) {
  if (expanded) {
    return (
      <button
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-smooth relative"
        style={active ? {
          background: 'rgba(201,168,76,0.12)',
          color: '#c9a84c',
        } : {}}
      >
        {active && (
          <span
            className="absolute left-0 w-0.5 h-5 rounded-r"
            style={{ background: '#c9a84c' }}
          />
        )}
        <div className="w-5 h-5 shrink-0">{item.icon}</div>
        <span className={`text-sm truncate ${active ? '' : 'text-muted-foreground hover:text-foreground'}`}>
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-smooth group relative"
      style={active ? { background: 'rgba(201,168,76,0.12)', color: '#c9a84c' } : {}}
    >
      <div className={`w-5 h-5 ${active ? '' : 'text-muted-foreground group-hover:text-foreground'}`}>{item.icon}</div>
      {/* Tooltip */}
      <span
        className="absolute left-full ml-2 px-2 py-1 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity"
        style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}
      >
        {item.label}
      </span>
      {active && (
        <span
          className="absolute left-0 w-0.5 h-5 rounded-r"
          style={{ background: '#c9a84c' }}
        />
      )}
    </button>
  )
}

// ─── Mobile Bottom Bar ─────────────────────────────────────────────────────────
function MobileBottomBar({ activeTab, setActiveTab, allPanels }: {
  activeTab: string
  setActiveTab: (tab: string) => void
  allPanels: PanelDef[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const priorityIds = ['overview', 'agents', 'tasks', 'activity']
  const priorityItems = allPanels.filter(p => priorityIds.includes(p.id)).slice(0, 4)
  const otherItems = allPanels.filter(p => !priorityIds.includes(p.id))
  const moreIsActive = otherItems.some(p => p.id === activeTab)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        style={{ background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-around px-1 h-14">
          {priorityItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg min-w-[48px] min-h-[48px]"
              style={activeTab === item.id ? { color: '#c9a84c' } : { color: 'rgba(150,150,170,0.7)' }}
            >
              <div className="w-5 h-5">{item.icon}</div>
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg min-w-[48px] min-h-[48px] relative"
            style={moreIsActive ? { color: '#c9a84c' } : { color: 'rgba(150,150,170,0.7)' }}
          >
            <div className="w-5 h-5">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="12" cy="8" r="1.5" />
              </svg>
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <MobileSheet
          allPanels={allPanels}
          activeTab={activeTab}
          setActiveTab={(id) => { setActiveTab(id); setSheetOpen(false) }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}

function MobileSheet({ allPanels, activeTab, setActiveTab, onClose }: {
  allPanels: PanelDef[]
  activeTab: string
  setActiveTab: (id: string) => void
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const groups = GROUP_ORDER.map(groupId => ({
    id: groupId,
    label: GROUP_LABELS[groupId] || 'CORE',
    items: allPanels.filter(p => p.group === groupId),
  })).filter(g => g.items.length > 0)

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={handleClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[70vh] overflow-y-auto safe-area-bottom transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div className="px-4 pb-6">
          {groups.map((group, i) => (
            <div key={group.id}>
              {i > 0 && <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />}
              <div className="px-1 pt-1 pb-2">
                <span className="text-[10px] tracking-widest font-semibold" style={{ color: 'rgba(201,168,76,0.5)' }}>
                  {group.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl transition-smooth"
                    style={activeTab === item.id
                      ? { background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }
                      : { color: '#e5e7eb' }
                    }
                  >
                    <div className="w-5 h-5 shrink-0">{item.icon}</div>
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Icons (SVG, 16x16 stroke) ─────────────────────────────────────────────────
function OverviewIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
}
function AgentsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>
}
function TasksIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="12" height="14" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h3" /></svg>
}
function SessionsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h12v9H2zM5 12v2M11 12v2M4 14h8" /></svg>
}
function BellIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13h4M3.5 10c0-1-1-2-1-4a5.5 5.5 0 0111 0c0 2-1 3-1 4H3.5z" /><path d="M8 1v1" /></svg>
}
function StandupIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="4" r="2.5" /><path d="M8 8v5M5.5 10h5" /></svg>
}
function ActivityIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,8 4,8 6,3 8,13 10,6 12,8 15,8" /></svg>
}
function FleetIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="4" height="4" rx="1" /><rect x="6" y="3" width="4" height="4" rx="1" /><rect x="11" y="3" width="4" height="4" rx="1" /><rect x="3.5" y="9" width="4" height="4" rx="1" /><rect x="8.5" y="9" width="4" height="4" rx="1" /><line x1="3" y1="7" x2="3" y2="9" /><line x1="8" y1="7" x2="5.5" y2="9" /><line x1="13" y1="7" x2="10.5" y2="9" /></svg>
}
function CostAnalyticsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7 9,9 15,3" /><line x1="1" y1="15" x2="15" y2="15" /></svg>
}
function LogsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M5 5h6M5 8h6M5 11h3" /></svg>
}
function TokensIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 4v8M5.5 6h5a1.5 1.5 0 010 3H6" /></svg>
}
function AgentCostsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="3" /><path d="M1 14c0-2.8 2.2-5 5-5" /><circle cx="12" cy="10" r="3.5" /><path d="M12 8.5v3M10.8 10h2.4" /></svg>
}
function MemoryIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="8" cy="8" rx="6" ry="3" /><path d="M2 8v3c0 1.7 2.7 3 6 3s6-1.3 6-3V8" /><path d="M2 5v3c0 1.7 2.7 3 6 3s6-1.3 6-3V5" /></svg>
}
function CronIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 4v4l2.5 2.5" /></svg>
}
function SpawnIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v12M8 2l-3 3M8 2l3 3" /><path d="M3 10h10" /></svg>
}
function WebhookIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="2.5" /><circle cx="11" cy="5" r="2.5" /><circle cx="8" cy="12" r="2.5" /><path d="M5 7.5v1c0 1.1.4 2 1.2 2.7" /><path d="M11 7.5v1c0 1.1-.4 2-1.2 2.7" /></svg>
}
function AlertIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13h4M3.5 10c0-1-1-2-1-4a5.5 5.5 0 0111 0c0 2-1 3-1 4H3.5z" /><path d="M8 1v1" /></svg>
}
function GitHubIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12.5c-3 1-3-1.5-4-2m8 4v-2.2a2.1 2.1 0 00-.6-1.6c2-.2 4.1-1 4.1-4.5a3.5 3.5 0 00-1-2.4 3.2 3.2 0 00-.1-2.4s-.8-.2-2.5 1a8.7 8.7 0 00-4.6 0C3.7 3.4 2.9 3.6 2.9 3.6a3.2 3.2 0 00-.1 2.4 3.5 3.5 0 00-1 2.4c0 3.5 2.1 4.3 4.1 4.5a2.1 2.1 0 00-.6 1.6v2.2" /></svg>
}
function PipelineIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="4" height="4" rx="1" /><rect x="6" y="6" width="4" height="4" rx="1" /><rect x="11" y="11" width="4" height="4" rx="1" /><line x1="5" y1="3" x2="8" y2="3" /><line x1="8" y1="3" x2="8" y2="6" /><line x1="10" y1="8" x2="13" y2="8" /><line x1="13" y1="8" x2="13" y2="11" /></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5" /><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" /><circle cx="11.5" cy="5.5" r="2" /><path d="M14.5 14c0-2 -1.5-3.5-3-3.5" /></svg>
}
function AuditIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L2 4v4c0 4 2.5 6 6 7 3.5-1 6-3 6-7V4L8 1z" /><path d="M6 8l2 2 3-3" /></svg>
}
function HistoryIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8a7 7 0 1014 0A7 7 0 011 8z" /><path d="M8 4v4l3 2" /><path d="M1 8h2" /></svg>
}
function GatewaysIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="14" height="5" rx="1" /><rect x="1" y="9" width="14" height="5" rx="1" /><circle cx="4" cy="4.5" r="0.75" fill="currentColor" stroke="none" /><circle cx="4" cy="11.5" r="0.75" fill="currentColor" stroke="none" /><path d="M7 4.5h5M7 11.5h5" /></svg>
}
function GatewayConfigIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5" /><circle cx="5.5" cy="8" r="1" /><circle cx="10.5" cy="8" r="1" /><path d="M6.5 8h3" /></svg>
}
function IntegrationsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="4" cy="4" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="4" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><path d="M6 4h4M4 6v4M12 6v4M6 12h4" /></svg>
}
function SuperAdminIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l1.4 2.8 3.1.5-2.2 2.2.5 3.1L8 8.8 5.2 10l.5-3.1L3.5 4.8l3.1-.5L8 1.5z" /><path d="M2 13.5h12" /></svg>
}
function SettingsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" /></svg>
}
