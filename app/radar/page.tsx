'use client';

import { useState } from 'react';

type Category = 'Industry News' | 'Competitor' | 'Tech Trend';
type Impact = 'High' | 'Medium' | 'Low';
type Tab = 'All' | 'Industry' | 'Competitors' | 'Tech Trends';

interface RadarItem {
  id: number;
  category: Category;
  title: string;
  source: string;
  date: string;
  summary: string;
  relevance: number;
  impact: Impact;
}

const CATEGORY_STYLES: Record<Category, { bg: string; border: string; color: string }> = {
  'Industry News': {
    bg: 'rgba(201,168,76,0.12)',
    border: '1px solid rgba(201,168,76,0.25)',
    color: 'var(--gold)',
  },
  Competitor: {
    bg: 'rgba(249,115,22,0.12)',
    border: '1px solid rgba(249,115,22,0.25)',
    color: '#f97316',
  },
  'Tech Trend': {
    bg: 'rgba(0,255,209,0.12)',
    border: '1px solid rgba(0,255,209,0.25)',
    color: 'var(--cyan)',
  },
};

const IMPACT_COLORS: Record<Impact, string> = {
  High: '#34d399',
  Medium: 'var(--gold)',
  Low: 'var(--muted)',
};

const TABS: Tab[] = ['All', 'Industry', 'Competitors', 'Tech Trends'];

const TAB_CATEGORY_MAP: Record<Tab, Category | null> = {
  All: null,
  Industry: 'Industry News',
  Competitors: 'Competitor',
  'Tech Trends': 'Tech Trend',
};

const items: RadarItem[] = [
  {
    id: 1,
    category: 'Tech Trend',
    title: 'OpenAI Releases GPT-5 Turbo',
    source: 'TechCrunch',
    date: 'Mar 4, 2026',
    summary:
      'OpenAI launches GPT-5 Turbo with 2x context window and significant improvements in reasoning benchmarks. Early adopters report 40% faster inference speeds.',
    relevance: 9,
    impact: 'High',
  },
  {
    id: 2,
    category: 'Industry News',
    title: 'Anthropic Expands Enterprise API',
    source: 'The Verge',
    date: 'Mar 3, 2026',
    summary:
      'Anthropic rolls out new enterprise API tiers with dedicated capacity, custom fine-tuning options, and SOC 2 Type II certification for Claude deployments.',
    relevance: 8,
    impact: 'High',
  },
  {
    id: 3,
    category: 'Competitor',
    title: 'Google DeepMind Merges Gemini Teams',
    source: 'Reuters',
    date: 'Mar 3, 2026',
    summary:
      'Google consolidates its Gemini research and product teams under a single org, aiming to accelerate model deployment cycles from quarterly to monthly releases.',
    relevance: 7,
    impact: 'Medium',
  },
  {
    id: 4,
    category: 'Industry News',
    title: 'EU AI Act Phase 2 Enforcement Begins',
    source: 'Bloomberg',
    date: 'Mar 2, 2026',
    summary:
      'The European Union begins enforcing Phase 2 of the AI Act, requiring transparency reports and risk assessments for all high-risk AI systems deployed in the EU.',
    relevance: 9,
    impact: 'High',
  },
  {
    id: 5,
    category: 'Competitor',
    title: 'Cursor IDE Reaches 10M Users',
    source: 'Ars Technica',
    date: 'Mar 1, 2026',
    summary:
      'AI-powered code editor Cursor crosses 10 million active users milestone, signaling mainstream adoption of AI-assisted development workflows.',
    relevance: 6,
    impact: 'Medium',
  },
  {
    id: 6,
    category: 'Tech Trend',
    title: 'WebAssembly 3.0 Specification Released',
    source: 'MDN',
    date: 'Feb 28, 2026',
    summary:
      'W3C finalizes WebAssembly 3.0 spec with native GC support, shared-nothing linking, and component model. Browser adoption expected within 3 months.',
    relevance: 5,
    impact: 'Low',
  },
  {
    id: 7,
    category: 'Competitor',
    title: 'Microsoft Copilot Studio GA',
    source: 'Microsoft Blog',
    date: 'Feb 27, 2026',
    summary:
      'Microsoft announces general availability of Copilot Studio, allowing enterprises to build custom AI agents with no-code tools integrated into the M365 ecosystem.',
    relevance: 7,
    impact: 'High',
  },
  {
    id: 8,
    category: 'Industry News',
    title: 'New NIST AI Security Framework',
    source: 'NIST',
    date: 'Feb 26, 2026',
    summary:
      'NIST publishes updated AI Risk Management Framework 2.0, introducing mandatory red-teaming standards and adversarial testing protocols for production AI systems.',
    relevance: 8,
    impact: 'High',
  },
  {
    id: 9,
    category: 'Tech Trend',
    title: 'Rust Overtakes Go in Cloud Native',
    source: 'InfoQ',
    date: 'Feb 25, 2026',
    summary:
      'CNCF survey shows Rust surpassing Go as the preferred language for new cloud-native projects, driven by WASM adoption and memory safety requirements.',
    relevance: 4,
    impact: 'Low',
  },
  {
    id: 10,
    category: 'Competitor',
    title: 'Meta Open-Sources Llama 4',
    source: 'Meta AI Blog',
    date: 'Feb 24, 2026',
    summary:
      'Meta releases Llama 4 under a permissive license with 400B parameters, multimodal capabilities, and state-of-the-art performance on coding and reasoning tasks.',
    relevance: 8,
    impact: 'High',
  },
  {
    id: 11,
    category: 'Industry News',
    title: 'AI Chip Export Controls Expanded',
    source: 'Financial Times',
    date: 'Feb 23, 2026',
    summary:
      'US Commerce Department expands AI chip export restrictions to additional countries, impacting GPU supply chains and cloud infrastructure availability globally.',
    relevance: 7,
    impact: 'Medium',
  },
  {
    id: 12,
    category: 'Tech Trend',
    title: 'Edge AI Inference Hits 100 TOPS',
    source: 'AnandTech',
    date: 'Feb 22, 2026',
    summary:
      'New mobile SoCs achieve 100 TOPS for on-device AI inference, enabling real-time LLM execution on smartphones without cloud connectivity.',
    relevance: 6,
    impact: 'Medium',
  },
];

function getRelevanceColor(score: number): string {
  if (score >= 8) return '#34d399';
  if (score >= 5) return 'var(--gold)';
  return 'var(--muted)';
}

export default function RadarPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All');

  const filtered =
    activeTab === 'All'
      ? items
      : items.filter((item) => item.category === TAB_CATEGORY_MAP[activeTab]);

  const counts = {
    All: items.length,
    Industry: items.filter((i) => i.category === 'Industry News').length,
    Competitors: items.filter((i) => i.category === 'Competitor').length,
    'Tech Trends': items.filter((i) => i.category === 'Tech Trend').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          Intelligence Radar
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Industry signals, competitor moves, and emerging tech trends
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 20,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                padding: '7px 16px',
                borderRadius: 8,
                border: isActive
                  ? '1px solid rgba(201,168,76,0.4)'
                  : '1px solid var(--glass-border)',
                background: isActive ? 'rgba(201,168,76,0.1)' : 'var(--glass)',
                color: isActive ? 'var(--gold)' : 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab}
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: isActive
                    ? 'rgba(201,168,76,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  color: isActive ? 'var(--gold)' : 'var(--muted)',
                }}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {filtered.map((item) => {
          const catStyle = CATEGORY_STYLES[item.category];
          const relColor = getRelevanceColor(item.relevance);
          const impactColor = IMPACT_COLORS[item.impact];

          return (
            <div
              key={item.id}
              className="glass glass-hover"
              style={{
                borderRadius: 12,
                padding: 20,
                cursor: 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Top row: category + relevance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: catStyle.bg,
                    border: catStyle.border,
                    color: catStyle.color,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {item.category}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: `${relColor}15`,
                    color: relColor,
                    border: `1px solid ${relColor}30`,
                  }}
                >
                  {item.relevance}/10
                </span>
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1.4,
                }}
              >
                {item.title}
              </h3>

              {/* Source & date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--gold)' }}>{item.source}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>&middot;</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.date}</span>
              </div>

              {/* Summary */}
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.summary}
              </p>

              {/* Impact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: impactColor,
                    boxShadow: `0 0 6px ${impactColor}`,
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Impact:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: impactColor,
                  }}
                >
                  {item.impact}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
