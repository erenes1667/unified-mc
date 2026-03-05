'use client';

import { useEffect, useState, useCallback } from 'react';

interface MemoryFile {
  filename: string;
  date: string;
  sizeKB: number;
  firstLines: string[];
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sizeKB?: number;
  date?: string;
  children?: TreeNode[];
}

interface SearchResult {
  path: string;
  line: string;
  lineNum: number;
}

type ViewMode = 'list' | 'tree' | 'search';

export default function MemoryPage() {
  const [longTerm, setLongTerm] = useState<MemoryFile | null>(null);
  const [daily, setDaily] = useState<MemoryFile[]>([]);
  const [subdirs, setSubdirs] = useState<string[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/memory')
      .then((r) => r.json())
      .then((d) => {
        setLongTerm(d.longTerm || null);
        setDaily(d.daily || []);
        setSubdirs(d.subdirs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadTree = useCallback(() => {
    fetch('/api/memory?mode=tree')
      .then((r) => r.json())
      .then((d) => setTree(d.tree || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (viewMode === 'tree' && tree.length === 0) loadTree();
  }, [viewMode, tree.length, loadTree]);

  const openFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingContent(true);
    try {
      const r = await fetch(`/api/memory?file=${encodeURIComponent(filePath)}`);
      const d = await r.json();
      setFileContent(d.content || 'Empty file');
    } catch {
      setFileContent('Failed to load content');
    } finally {
      setLoadingContent(false);
    }
  };

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setViewMode('search');
    try {
      const r = await fetch(`/api/memory?search=${encodeURIComponent(searchQuery)}`);
      const d = await r.json();
      setSearchResults(d.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left panel: Navigation */}
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', margin: 0 }}>🧠 Memory</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
            {daily.length} files{subdirs.length > 0 ? ` · ${subdirs.length} folders` : ''}
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search memory files..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text)', outline: 'none',
            }}
          />
          <button
            onClick={doSearch}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
              background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
              color: 'var(--gold)',
            }}
          >
            Search
          </button>
        </div>

        {/* View mode tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['list', 'tree'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: viewMode === mode ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: `1px solid ${viewMode === mode ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                color: viewMode === mode ? 'var(--gold)' : 'var(--muted)',
                textTransform: 'capitalize',
              }}
            >
              {mode === 'list' ? '📋 Recent' : '🗂️ Tree'}
            </button>
          ))}
          {viewMode === 'search' && (
            <span style={{ padding: '6px 14px', fontSize: 11, color: 'var(--gold)', background: 'rgba(201,168,76,0.15)', borderRadius: 6, border: '1px solid rgba(201,168,76,0.3)' }}>
              🔍 Search
            </span>
          )}
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="glass" style={{ borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Loading...
            </div>
          ) : viewMode === 'search' ? (
            /* Search results */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searching ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No results found</div>
              ) : (
                searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="glass glass-hover"
                    onClick={() => openFile(r.path)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      borderLeft: selectedFile === r.path ? '2px solid var(--gold)' : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{r.path}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      L{r.lineNum}: {r.line}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : viewMode === 'tree' ? (
            /* Tree view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tree.map((node) => (
                <TreeNodeView
                  key={node.path}
                  node={node}
                  depth={0}
                  expanded={expandedDirs}
                  onToggle={toggleDir}
                  onSelect={openFile}
                  selected={selectedFile}
                />
              ))}
            </div>
          ) : (
            /* Recent list view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {longTerm && (
                <div
                  className="glass glass-hover"
                  onClick={() => openFile(longTerm.filename)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    borderLeft: selectedFile === longTerm.filename ? '2px solid var(--gold)' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🏛️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Long-term Memory</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{longTerm.sizeKB} KB · {formatDate(longTerm.date)}</div>
                    </div>
                  </div>
                </div>
              )}
              {daily.map((file) => (
                <div
                  key={file.filename}
                  className="glass glass-hover"
                  onClick={() => openFile(file.filename)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    borderLeft: selectedFile === file.filename ? '2px solid var(--gold)' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>📝</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.filename.replace('.md', '')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {file.sizeKB} KB · {formatDate(file.date)} {formatTime(file.date)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Content viewer */}
      <div className="glass" style={{ flex: 1, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedFile ? (
          <>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedFile}</span>
              </div>
              <button
                onClick={() => { setSelectedFile(null); setFileContent(''); }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--muted)',
                }}
              >
                Close
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {loadingContent ? (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
              ) : (
                <pre style={{
                  fontFamily: 'inherit', fontSize: 12, color: 'var(--text)',
                  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                }}>
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNodeView({
  node, depth, expanded, onToggle, onSelect, selected,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  selected: string | null;
}) {
  const isExpanded = expanded.has(node.path);
  const isDir = node.type === 'dir';
  const isSelected = selected === node.path;

  return (
    <>
      <div
        className="glass-hover"
        onClick={() => isDir ? onToggle(node.path) : onSelect(node.path)}
        style={{
          padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
          paddingLeft: 10 + depth * 16,
          display: 'flex', alignItems: 'center', gap: 6,
          borderLeft: isSelected ? '2px solid var(--gold)' : '2px solid transparent',
          background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--muted)', width: 14, textAlign: 'center' }}>
          {isDir ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        <span style={{ fontSize: 12, color: isDir ? 'var(--gold)' : 'var(--text)' }}>
          {isDir ? '📁' : '📄'} {node.name}
        </span>
        {node.sizeKB !== undefined && (
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{node.sizeKB} KB</span>
        )}
      </div>
      {isDir && isExpanded && node.children?.map((child) => (
        <TreeNodeView
          key={child.path}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          selected={selected}
        />
      ))}
    </>
  );
}
