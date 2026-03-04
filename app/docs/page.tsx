'use client';

import { useState } from 'react';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { title: 'Installation Guide', content: 'Run the installer script to set up Unified MC. It will guide you through API key configuration, agent setup, and integration connections.' },
      { title: 'First Steps', content: 'After installation, open the Chat panel to interact with your AI assistant. It can help you manage emails, track projects, and automate routine tasks.' },
      { title: 'Understanding Panels', content: 'The sidebar contains all available panels. Each panel serves a specific function: Chat for conversations, Tasks for project tracking, Memory for knowledge storage, and more.' },
    ],
  },
  {
    title: 'Configuration',
    icon: '⚙️',
    items: [
      { title: 'API Keys', content: 'API keys are stored in ~/.openclaw/openclaw.json. You can update them in the Settings panel or by editing the file directly.' },
      { title: 'Model Selection', content: 'The system supports multiple AI models: Claude (Anthropic), GPT (OpenAI), and Gemini (Google). Configure your preferred model in Settings.' },
      { title: 'Rate Limits', content: 'Rate limits control how many messages per hour are sent to premium models. When limits are reached, the system silently falls back to a free model.' },
      { title: 'Integrations', content: 'Connect Gmail, Slack, Calendar, and GitHub through the Settings panel. All integrations are read-only by default for safety.' },
    ],
  },
  {
    title: 'API Reference',
    icon: '📡',
    items: [
      { title: 'GET /api/team', content: 'Returns agent configuration including names, models, roles, and online status.' },
      { title: 'GET /api/memory', content: 'Returns memory files from the workspace. Supports ?file= query parameter for specific files.' },
      { title: 'GET /api/projects', content: 'Returns project directory listing with names and file counts.' },
      { title: 'GET /api/cron', content: 'Returns configured cron job schedules and their last run status.' },
      { title: 'GET /api/role', content: 'Returns role configuration including rate limits and allowed panels.' },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: '🔧',
    items: [
      { title: 'Gateway Not Connecting', content: 'Ensure OpenClaw gateway is running: openclaw gateway start. Check if port 18789 is available. Restart with: openclaw gateway restart.' },
      { title: 'Chat Not Responding', content: 'Verify your API key is valid in Settings. Check the Activity feed for errors. Try sending a simple message like "hello".' },
      { title: 'Pages Loading Slowly', content: 'If in development mode, pages compile on first visit. Run npm run build for production mode which pre-compiles all pages.' },
      { title: 'Integration Errors', content: 'Re-authenticate the integration in Settings. Ensure you granted the correct permissions (read-only is sufficient for most features).' },
    ],
  },
];

export default function DocsPage() {
  const [openSection, setOpenSection] = useState<number>(0);
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>📄 Documentation</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Guides, API reference, and troubleshooting</p>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Sidebar */}
        <div className="glass" style={{ borderRadius: 12, padding: 16 }}>
          {SECTIONS.map((sec, i) => (
            <div
              key={i}
              onClick={() => setOpenSection(i)}
              className="glass-hover"
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 10,
                color: openSection === i ? 'var(--gold)' : 'var(--muted)',
                background: openSection === i ? 'rgba(201,168,76,0.1)' : 'transparent',
                fontSize: 13,
              }}
            >
              <span>{sec.icon}</span> {sec.title}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="glass" style={{ borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', marginBottom: 20 }}>
            {SECTIONS[openSection].icon} {SECTIONS[openSection].title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SECTIONS[openSection].items.map((item, i) => {
              const key = `${openSection}-${i}`;
              const isOpen = openItem === key;
              return (
                <div key={i} className="glass" style={{ borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    onClick={() => setOpenItem(isOpen ? null : key)}
                    className="glass-hover"
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
