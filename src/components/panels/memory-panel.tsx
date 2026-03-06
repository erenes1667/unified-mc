'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface FileNode {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: number
  children?: FileNode[]
}

interface SearchResult {
  path: string
  name: string
  matches: number
  snippets: string[]
}

type ActiveTab = 'tree' | 'recent' | 'search'

function FileIcon({ node }: { node: FileNode }) {
  if (node.type === 'directory') return <span>📁</span>
  if (node.name.endsWith('.md')) return <span>📝</span>
  if (node.name.endsWith('.json') || node.name.endsWith('.jsonl')) return <span>📊</span>
  return <span>📄</span>
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(depth === 0)

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '3px 8px',
          paddingLeft: `${8 + depth * 14}px`,
          cursor: 'pointer',
          background: selectedPath === node.path ? 'rgba(201,168,76,0.15)' : 'transparent',
          borderRadius: '4px',
          color: selectedPath === node.path ? '#c9a84c' : 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          userSelect: 'none',
        }}
        onClick={() => {
          if (node.type === 'directory') {
            setExpanded(e => !e)
          } else {
            onSelect(node.path)
          }
        }}
        onMouseEnter={e => {
          if (selectedPath !== node.path) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
          }
        }}
        onMouseLeave={e => {
          if (selectedPath !== node.path) {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        }}
      >
        {node.type === 'directory' && (
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', width: '10px' }}>
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {node.type === 'file' && <span style={{ width: '10px' }} />}
        <FileIcon node={node} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        {node.type === 'file' && node.size !== undefined && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
            {formatSize(node.size)}
          </span>
        )}
      </div>
      {node.type === 'directory' && expanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`
}

function MarkdownViewer({ content }: { content: string }) {
  const rendered = content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:12px;overflow-x:auto;margin:8px 0;font-size:12px;"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:3px;font-size:12px;">$1</code>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3 style="color:#c9a84c;font-size:14px;margin:16px 0 6px;">$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2 style="color:#c9a84c;font-size:16px;margin:20px 0 8px;border-bottom:1px solid rgba(201,168,76,0.2);padding-bottom:6px;">$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1 style="color:#c9a84c;font-size:18px;margin:20px 0 10px;">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:rgba(255,255,255,0.95);">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^-\s+(.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin:4px 0;list-style-type:decimal;">$2</li>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
    .replace(/\n/g, '<br/>')

  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<p style="margin:0;">${rendered}</p>` }}
      style={{
        fontSize: '13px', lineHeight: '1.7',
        color: 'rgba(255,255,255,0.8)',
        padding: '16px',
      }}
    />
  )
}

export function MemoryPanel() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [treeLoading, setTreeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tree')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadTree = useCallback(async () => {
    setTreeLoading(true)
    try {
      const res = await fetch('/api/fs/tree')
      const data = await res.json()
      setTree(data.tree || [])
    } catch (err) {
      console.error('Failed to load tree:', err)
    } finally {
      setTreeLoading(false)
    }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/fs/recent?limit=20')
      const data = await res.json()
      setRecentFiles(data.files || [])
    } catch (err) {
      console.error('Failed to load recent:', err)
    }
  }, [])

  useEffect(() => {
    loadTree()
    loadRecent()
  }, [loadTree, loadRecent])

  const selectFile = useCallback(async (path: string) => {
    setSelectedPath(path)
    setContentLoading(true)
    setContent(null)
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      setContent(data.content || null)
    } catch {
      setContent('Error loading file.')
    } finally {
      setContentLoading(false)
    }
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/fs/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const onSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400)
  }

  const isMarkdown = selectedPath?.endsWith('.md')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#c9a84c' }}>🧠 Memory</h2>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>~/.openclaw/workspace</span>
        <button
          onClick={loadTree}
          style={{
            marginLeft: 'auto', padding: '4px 10px', fontSize: '11px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}
        >
          ⟳ Refresh
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Left pane: tree / recent / search */}
        <div style={{
          width: '240px', borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '4px 8px', gap: '4px',
          }}>
            {(['tree', 'recent', 'search'] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '4px 6px', fontSize: '10px',
                  background: activeTab === tab ? 'rgba(201,168,76,0.15)' : 'transparent',
                  border: `1px solid ${activeTab === tab ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                  borderRadius: '4px', cursor: 'pointer',
                  color: activeTab === tab ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'tree' ? '🌳' : tab === 'recent' ? '🕐' : '🔍'} {tab}
              </button>
            ))}
          </div>

          {/* Search input */}
          {activeTab === 'search' && (
            <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchInput(e.target.value)}
                placeholder="Search .md files..."
                style={{
                  width: '100%', padding: '6px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', fontSize: '12px',
                  color: 'rgba(255,255,255,0.8)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'tree' && (
              treeLoading ? (
                <div style={{ padding: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
              ) : (
                <div style={{ padding: '4px 0' }}>
                  {tree.map(node => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      selectedPath={selectedPath}
                      onSelect={selectFile}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'recent' && (
              <div style={{ padding: '4px 0' }}>
                {recentFiles.map(f => (
                  <div
                    key={f.path}
                    onClick={() => selectFile(f.path)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: selectedPath === f.path ? 'rgba(201,168,76,0.15)' : 'transparent',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={e => { if (selectedPath !== f.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if (selectedPath !== f.path) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📝 {f.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      {f.modified ? new Date(f.modified).toLocaleDateString() : ''} · {f.path.split('/').slice(0, -1).join('/')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'search' && (
              <div style={{ padding: '4px 0' }}>
                {isSearching && (
                  <div style={{ padding: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Searching...</div>
                )}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                  <div style={{ padding: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No results</div>
                )}
                {searchResults.map(r => (
                  <div
                    key={r.path}
                    onClick={() => selectFile(r.path)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedPath === r.path ? 'rgba(201,168,76,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedPath !== r.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (selectedPath !== r.path) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: '12px', color: '#c9a84c', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.path}
                    </div>
                    {r.snippets.slice(0, 2).map((s, i) => (
                      <div key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: content viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedPath ? (
            <>
              {/* File header */}
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedPath}
                </span>
                {isMarkdown && (
                  <button
                    onClick={() => setViewMode(m => m === 'rendered' ? 'raw' : 'rendered')}
                    style={{
                      marginLeft: 'auto', flexShrink: 0,
                      padding: '3px 8px', fontSize: '10px',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                    }}
                  >
                    {viewMode === 'rendered' ? 'Raw' : 'Rendered'}
                  </button>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {contentLoading ? (
                  <div style={{ padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
                ) : content === null ? (
                  <div style={{ padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Empty or unreadable file.</div>
                ) : isMarkdown && viewMode === 'rendered' ? (
                  <MarkdownViewer content={content} />
                ) : (
                  <pre style={{
                    margin: 0, padding: '16px',
                    fontSize: '12px', lineHeight: '1.6',
                    color: 'rgba(255,255,255,0.8)',
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '12px', color: 'rgba(255,255,255,0.2)',
            }}>
              <span style={{ fontSize: '48px' }}>🧠</span>
              <span style={{ fontSize: '14px' }}>Select a file to view</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>Browse the tree or search</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
