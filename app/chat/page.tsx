'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkRateLimit, recordUsage, getUsage } from '@/lib/rate-limiter';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: number;
  model?: string;
}

interface ChatTab {
  id: string;
  label: string;
  sessionKey: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  isProcessing: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RoleCfg {
  role: string;
  label: string;
  rateLimit: number | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GATEWAY_URL = 'ws://127.0.0.1:18789';
const CLIENT_ID = 'openclaw-control-ui';
const FALLBACK_TOKEN = 'REDACTED_TOKEN';
const DEVICE_STORAGE_KEY = 'umc-device-identity-v1';
const DEVICE_TOKEN_STORAGE_KEY = 'umc-device-tokens-v1';

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ── Ed25519 helpers ──────────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function sha256hex(bytes: Uint8Array): Promise<string> {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest('SHA-256', ab);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface DeviceIdentity {
  version: number;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
}

async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  // Try loading stored identity
  try {
    const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceIdentity;
      if (parsed?.version === 1 && parsed.deviceId && parsed.publicKey && parsed.privateKey) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }

  // Generate new Ed25519 key pair
  const ed = await import('@noble/ed25519');
  const privBytes = crypto.getRandomValues(new Uint8Array(32));
  const pubBytes = await ed.getPublicKeyAsync(privBytes);
  const deviceId = await sha256hex(pubBytes);

  const identity: DeviceIdentity = {
    version: 1,
    deviceId,
    publicKey: toBase64url(pubBytes),
    privateKey: toBase64url(privBytes),
    createdAtMs: Date.now(),
  };
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

function buildSigningPayload(opts: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
}): string {
  const n = (opts.scopes || []).join(',');
  const s = opts.token ?? '';
  return [
    'v2',
    opts.deviceId,
    opts.clientId,
    opts.clientMode,
    opts.role,
    n,
    String(opts.signedAtMs),
    s,
    opts.nonce,
  ].join('|');
}

function getStoredDeviceToken(deviceId: string): string | null {
  try {
    const stored = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || parsed.version !== 1 || parsed.deviceId !== deviceId) return null;
    return parsed.tokens?.op?.token ?? null;
  } catch {
    return null;
  }
}

function storeDeviceToken(deviceId: string, token: string): void {
  try {
    const data = { version: 1, deviceId, tokens: { op: { token } } };
    const existing = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.deviceId === deviceId) {
        parsed.tokens = { ...parsed.tokens, op: { token } };
        localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, JSON.stringify(parsed));
        return;
      }
    }
    localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ── Simple Markdown styles ───────────────────────────────────────────────────

const mdComponents: Record<string, React.ComponentType<React.HTMLAttributes<HTMLElement>>> = {
  p: ({ children, ...props }) => (
    <p {...props} style={{ margin: '0 0 8px 0', lineHeight: 1.6 }}>
      {children}
    </p>
  ),
  code: ({ children, ...props }) => (
    <code
      {...props}
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 4,
        padding: '1px 5px',
        fontSize: '0.85em',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      style={{
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 8,
        padding: '12px 14px',
        overflowX: 'auto',
        fontSize: 12,
        lineHeight: 1.5,
        margin: '8px 0',
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </pre>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} style={{ paddingLeft: 20, margin: '4px 0 8px 0' }}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} style={{ paddingLeft: 20, margin: '4px 0 8px 0' }}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props} style={{ margin: '2px 0', lineHeight: 1.5 }}>
      {children}
    </li>
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--cyan)', textDecoration: 'underline' }}
    >
      {children}
    </a>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props} style={{ color: 'var(--gold)', fontWeight: 600 }}>
      {children}
    </strong>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      style={{
        borderLeft: '3px solid rgba(201,168,76,0.4)',
        paddingLeft: 12,
        margin: '8px 0',
        color: 'rgba(255,255,255,0.6)',
        fontStyle: 'italic',
      }}
    >
      {children}
    </blockquote>
  ),
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [roleCfg, setRoleCfg] = useState<RoleCfg>({
    role: 'emperor',
    label: 'Emperor',
    rateLimit: null,
  });
  const [tabs, setTabs] = useState<ChatTab[]>([
    {
      id: 'main',
      label: 'Main',
      sessionKey: 'agent:main:main',
      messages: [],
      isStreaming: false,
      streamingText: '',
      isProcessing: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('main');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [rateBadge, setRateBadge] = useState<{ remaining: number | null; limit: number | null } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);
  const pendingRef = useRef<
    Map<string, { resolve: (p: unknown) => void; reject: (e: Error) => void }>
  >(new Map());
  const tabsRef = useRef(tabs);
  const activeTabRef = useRef(activeTabId);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const roleCfgRef = useRef(roleCfg);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabRef.current = activeTabId; }, [activeTabId]);
  useEffect(() => { roleCfgRef.current = roleCfg; }, [roleCfg]);

  // Load role config from JSON
  useEffect(() => {
    const roleId = (process.env.NEXT_PUBLIC_UMC_ROLE as string) || 'emperor';
    fetch(`/api/role?id=${roleId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setRoleCfg({ role: data.role || roleId, label: data.label || roleId, rateLimit: data.rateLimit ?? null });
        }
      })
      .catch(() => {/* keep default */});
  }, []);

  // Update rate badge when role changes
  useEffect(() => {
    if (roleCfg.rateLimit === null) {
      setRateBadge(null);
      return;
    }
    const usage = getUsage(roleCfg.rateLimit);
    setRateBadge({ remaining: usage.remaining, limit: roleCfg.rateLimit });
  }, [roleCfg]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tabs, activeTabId]);

  // ── WebSocket helpers ────────────────────────────────────────────────────

  const request = useCallback(
    (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== 1 || !connectedRef.current) {
          return reject(new Error('Not connected'));
        }
        const id = uuid();
        pendingRef.current.set(id, { resolve, reject });
        ws.send(JSON.stringify({ type: 'req', id, method, params }));
        setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            reject(new Error('Timeout'));
          }
        }, 120000);
      });
    },
    []
  );

  // ── Auth flow (v2 Ed25519) ───────────────────────────────────────────────

  const sendConnect = useCallback(async (nonce: string) => {
    const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing'];
    const role = 'operator';
    const clientMode = 'webchat';

    let deviceObj: {
      id: string;
      publicKey: string;
      signature: string;
      signedAt: number;
      nonce: string;
    } | null = null;

    let authToken: string | null = FALLBACK_TOKEN;

    try {
      const ed = await import('@noble/ed25519');
      const identity = await getOrCreateDeviceIdentity();

      // Use stored device token if available
      const storedToken = getStoredDeviceToken(identity.deviceId);
      if (storedToken) authToken = storedToken;

      const signedAtMs = Date.now();
      const payload = buildSigningPayload({
        deviceId: identity.deviceId,
        clientId: CLIENT_ID,
        clientMode,
        role,
        scopes,
        signedAtMs,
        token: authToken,
        nonce,
      });

      const privBytes = fromBase64url(identity.privateKey);
      const payloadBytes = new TextEncoder().encode(payload);
      const sigBytes = await ed.signAsync(payloadBytes, privBytes);

      deviceObj = {
        id: identity.deviceId,
        publicKey: identity.publicKey,
        signature: toBase64url(sigBytes),
        signedAt: signedAtMs,
        nonce,
      };
    } catch (e) {
      console.warn('[UMC] Ed25519 signing failed, using basic auth:', e);
    }

    const frameId = uuid();
    const frame = {
      type: 'req',
      id: frameId,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: { id: CLIENT_ID, version: '2.0.0', platform: 'web', mode: clientMode },
        role,
        scopes,
        device: deviceObj,
        caps: [],
        auth: authToken ? { token: authToken } : undefined,
        userAgent: navigator.userAgent,
        locale: navigator.language,
      },
    };

    wsRef.current?.send(JSON.stringify(frame));
    pendingRef.current.set(frameId, {
      resolve: (payload: unknown) => {
        const p = payload as { auth?: { deviceToken?: string; role?: string } } | null;
        if (p?.auth?.deviceToken && deviceObj) {
          storeDeviceToken(deviceObj.id, p.auth.deviceToken);
        }
        connectedRef.current = true;
        setStatus('connected');
        // Load history for active tab
        const activeSession = tabsRef.current.find((t) => t.id === activeTabRef.current);
        if (activeSession) loadHistory(activeSession.sessionKey);
      },
      reject: () => {
        // Clear stale device tokens
        try { localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY); } catch {/* ignore */}
        setStatus('error');
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load history ─────────────────────────────────────────────────────────

  const loadHistory = useCallback(
    async (sessionKey: string) => {
      try {
        const result = (await request('chat.history', { sessionKey, limit: 60 })) as {
          messages?: { role: string; content: { type: string; text: string }[]; model?: string }[];
        };
        if (result?.messages) {
          const msgs: ChatMessage[] = result.messages
            .map((m) => ({
              id: uuid(),
              role: m.role as ChatMessage['role'],
              text:
                m.content
                  ?.filter((c) => c.type === 'text')
                  .map((c) => c.text)
                  .join('') || '',
              ts: Date.now(),
              model: m.model,
            }))
            .filter((m) => m.text.trim());
          setTabs((prev) =>
            prev.map((t) => (t.sessionKey === sessionKey ? { ...t, messages: msgs } : t))
          );
        }
      } catch {/* ignore */}
    },
    [request]
  );

  // ── Handle incoming messages ─────────────────────────────────────────────

  const handleMessage = useCallback(
    (data: {
      type: string;
      event?: string;
      payload?: Record<string, unknown>;
      id?: string;
      ok?: boolean;
      error?: { message?: string };
    }) => {
      if (data.type === 'event' && data.event === 'connect.challenge') {
        const nonce = (data.payload?.nonce as string) || '';
        sendConnect(nonce).catch(() => setStatus('error'));
        return;
      }

      if (data.id && pendingRef.current.has(data.id)) {
        const { resolve, reject } = pendingRef.current.get(data.id)!;
        pendingRef.current.delete(data.id);
        if (data.ok === false) reject(new Error((data.error?.message as string) || 'Error'));
        else resolve(data.payload);
        return;
      }

      if (data.type === 'event' && data.event === 'chat' && data.payload?.sessionKey) {
        const sessionKey = data.payload.sessionKey as string;
        const state = data.payload.state as string;
        const message = data.payload.message as {
          role: string;
          content: { type: string; text: string }[];
          model?: string;
        } | undefined;

        if (state === 'delta' && message) {
          const text =
            message.content?.filter((c) => c.type === 'text').map((c) => c.text).join('') || '';
          setTabs((prev) =>
            prev.map((t) =>
              t.sessionKey === sessionKey
                ? {
                    ...t,
                    isStreaming: true,
                    streamingText: text.length > t.streamingText.length ? text : t.streamingText,
                  }
                : t
            )
          );
        }

        if (state === 'final' || state === 'error' || state === 'aborted') {
          const text = message
            ? message.content?.filter((c) => c.type === 'text').map((c) => c.text).join('') || ''
            : '';
          setTabs((prev) =>
            prev.map((t) => {
              if (t.sessionKey !== sessionKey) return t;
              const msgs = text
                ? [...t.messages, { id: uuid(), role: 'assistant' as const, text, ts: Date.now(), model: message?.model }]
                : t.messages;
              return { ...t, messages: msgs, isStreaming: false, streamingText: '', isProcessing: false };
            })
          );
        }
      }
    },
    [sendConnect]
  );

  // ── Connect / reconnect ──────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch {/* ignore */} }
    setStatus('connecting');
    try {
      const ws = new WebSocket(GATEWAY_URL);
      wsRef.current = ws;
      ws.onopen = () => { reconnectAttempts.current = 0; };
      ws.onclose = () => { connectedRef.current = false; setStatus('disconnected'); scheduleReconnect(); };
      ws.onerror = () => { setStatus('error'); scheduleReconnect(); };
      ws.onmessage = (e) => { try { handleMessage(JSON.parse(e.data)); } catch {/* ignore */} };
    } catch { setStatus('error'); scheduleReconnect(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMessage]);

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return;
    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 30000);
    reconnectTimer.current = setTimeout(() => { reconnectTimer.current = null; connect(); }, delay);
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !connectedRef.current) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const tab = tabsRef.current.find((t) => t.id === activeTabRef.current);
    if (!tab) return;

    // Rate limit check
    const rl = checkRateLimit(roleCfgRef.current.rateLimit);
    const modelToUse = rl.model;

    // Record usage if using Claude
    if (!rl.isFallback) {
      recordUsage();
      // Update badge
      if (roleCfgRef.current.rateLimit !== null) {
        const usage = getUsage(roleCfgRef.current.rateLimit);
        setRateBadge({ remaining: usage.remaining, limit: roleCfgRef.current.rateLimit });
      }
    }

    // Add user message
    const userMsg: ChatMessage = { id: uuid(), role: 'user', text, ts: Date.now() };
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tab.id ? { ...t, messages: [...t.messages, userMsg], isProcessing: true } : t
      )
    );

    try {
      await request('chat.send', {
        sessionKey: tab.sessionKey,
        message: text,
        idempotencyKey: uuid(),
        deliver: false,
        model: rl.isFallback ? modelToUse : undefined,
      });
    } catch {
      setTabs((prev) =>
        prev.map((t) => (t.id === tab.id ? { ...t, isProcessing: false } : t))
      );
    }
  }, [input, request]);

  // ── Tab management ───────────────────────────────────────────────────────

  const addTab = () => {
    const id = uuid().slice(0, 8);
    const sessionKey = `agent:main:webchat:umc:${id}`;
    const newTab: ChatTab = {
      id,
      label: `Chat ${tabs.length + 1}`,
      sessionKey,
      messages: [],
      isStreaming: false,
      streamingText: '',
      isProcessing: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) setActiveTabId(next[0].id);
      return next;
    });
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const statusColor =
    status === 'connected' ? '#34d399' : status === 'connecting' ? '#fbbf24' : '#ef4444';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* ── Tab bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingBottom: 12,
          borderBottom: '1px solid var(--glass-border)',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTabId(tab.id);
              if (connectedRef.current) loadHistory(tab.sessionKey);
            }}
            className="glass"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: tab.id === activeTabId ? 'var(--gold)' : 'var(--muted)',
              borderColor: tab.id === activeTabId ? 'rgba(201,168,76,0.3)' : 'var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: tab.id === activeTabId ? 'rgba(201,168,76,0.1)' : 'var(--glass)',
              transition: 'all 0.15s',
            }}
          >
            <span>{tab.label}</span>
            {tab.isProcessing && (
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#fbbf24', display: 'inline-block',
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
            {tabs.length > 1 && (
              <span
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                style={{ marginLeft: 4, opacity: 0.5, cursor: 'pointer', fontSize: 11, lineHeight: 1 }}
              >
                ✕
              </span>
            )}
          </div>
        ))}

        {/* + new tab */}
        <button
          onClick={addTab}
          title="New chat window"
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px dashed var(--glass-border)',
            background: 'transparent', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>

        {/* Connection status + rate badge */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Rate limit badge */}
          {rateBadge !== null && (
            <div
              style={{
                fontSize: 10,
                padding: '3px 9px',
                borderRadius: 20,
                background:
                  (rateBadge.remaining ?? 0) === 0
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(201,168,76,0.1)',
                border: `1px solid ${(rateBadge.remaining ?? 0) === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.2)'}`,
                color: (rateBadge.remaining ?? 0) === 0 ? '#ef4444' : 'var(--muted)',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
              title={
                (rateBadge.remaining ?? 0) === 0
                  ? 'Claude limit reached — using Kimi K2.5'
                  : `${rateBadge.remaining}/${rateBadge.limit} Claude messages remaining`
              }
            >
              {(rateBadge.remaining ?? 0) === 0
                ? '⚡ Kimi fallback'
                : `${rateBadge.remaining}/${rateBadge.limit} remaining`}
            </div>
          )}
          {/* Connection dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
              }}
            />
            {status === 'connected' ? 'Online' : status === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
        </div>
      </div>

      {/* ── Message area ── */}
      <div
        className="glass"
        style={{
          flex: 1,
          borderRadius: 12,
          marginTop: 12,
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 0,
        }}
      >
        {activeTab.messages.length === 0 && !activeTab.isStreaming ? (
          <div
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 36 }}>💬</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              Send a message to begin
            </span>
          </div>
        ) : (
          <>
            {activeTab.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Streaming response */}
            {activeTab.isStreaming && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Agent
                </span>
                <div
                  style={{
                    background: 'rgba(0, 180, 216, 0.05)',
                    border: '1px solid rgba(0, 180, 216, 0.15)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '4px 14px 14px 14px',
                    padding: '12px 16px',
                    maxWidth: '82%',
                    fontSize: 13,
                    color: 'var(--text)',
                    lineHeight: 1.6,
                  }}
                >
                  {activeTab.streamingText ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as never}>
                      {activeTab.streamingText}
                    </ReactMarkdown>
                  ) : (
                    <StreamingDots />
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          marginTop: 12,
          borderRadius: 12,
          padding: '10px 14px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={status === 'connected' ? 'Message Mickey17... (Shift+Enter for newline)' : 'Connecting to gateway...'}
          disabled={status !== 'connected'}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            resize: 'none',
            lineHeight: 1.6,
            minHeight: 24,
            maxHeight: 180,
            overflowY: 'auto',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={status !== 'connected' || !input.trim()}
          style={{
            flexShrink: 0,
            background: input.trim() ? 'rgba(201,168,76,0.2)' : 'transparent',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 8,
            padding: '7px 18px',
            color: input.trim() ? 'var(--gold)' : 'var(--muted)',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.15s',
            marginBottom: 2,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: isUser ? 'var(--gold)' : 'var(--cyan)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}
      >
        {isUser ? 'You' : msg.role === 'assistant' ? 'Agent' : 'System'}
        {!isUser && msg.model && (
          <span style={{ color: 'var(--muted)', textTransform: 'none', fontWeight: 400, marginLeft: 6 }}>
            · {msg.model}
          </span>
        )}
      </span>
      <div
        style={{
          background: isUser
            ? 'rgba(201, 168, 76, 0.1)'
            : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isUser ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          padding: '10px 14px',
          maxWidth: '82%',
          fontSize: 13,
          color: 'var(--text)',
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as never}>
            {msg.text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--cyan)',
            opacity: 0.7,
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
