'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface DocFile {
  path: string
  name: string
  title: string
  tags: string[]
  size: number
  modified: number
  excerpt?: string
}

interface SearchResult {
  path: string
  name: string
  title: string
  snippets: string[]
  modified: number
}

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown → HTML renderer with syntax highlighting placeholders
  const render = (text: string): string => {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:12px;overflow-x:auto;margin:12px 0;"><code style="font-size:12px;font-family:JetBrains Mono,monospace;color:#00ffd1;" class="language-${lang}">${code}</code></pre>`
      )
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,255,209,0.1);color:#00ffd1;padding:1px 6px;border-radius:3px;font-size:12px;font-family:JetBrains Mono,monospace;">$1</code>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;color:#c9a84c;margin:24px 0 12px;border-bottom:1px solid rgba(201,168,76,0.2);padding-bottom:8px;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:700;color:#c9a84c;margin:20px 0 10px;">$2</h2>'.replace('$2', '$1'))
      .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:rgba(201,168,76,0.8);margin:16px 0 8px;">$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4 style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);margin:12px 0 6px;">$1</h4>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong style="color:rgba(255,255,255,0.95);font-weight:700;">$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em style="color:rgba(255,255,255,0.8);">$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00ffd1;text-decoration:underline;" target="_blank">$1</a>')
      .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid rgba(201,168,76,0.4);padding:4px 12px;margin:8px 0;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.03);border-radius:0 4px 4px 0;">$1</blockquote>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;"/>')
      .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><input type="checkbox" disabled/><span>$1</span></div>')
      .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><input type="checkbox" disabled checked/><span style="text-decoration:line-through;opacity:0.5;">$1</span></div>')
      .replace(/^- (.+)$/gm, '<li style="margin:4px 0;color:rgba(255,255,255,0.8);">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:4px 0;list-style-type:decimal;color:rgba(255,255,255,0.8);">$2</li>')
      .replace(/\n\n/g, '</p><p style="margin:10px 0;">')
      .replace(/\n/g, '<br/>')
  }

  // Strip frontmatter
  const body = content.replace(/^---[\s\S]*?---\n/, '')

  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<p style="margin:0;">${render(body)}</p>` }}
      style={{
        fontSize: '14px',
        lineHeight: '1.8',
        color: 'rgba(255,255,255,0.8)',
        padding: '24px',
        maxWidth: '800px',
      }}
    />
  )
}

export function DocsPanel() {
  const [docs, setDocs] = useState<DocFile[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadDocs = useCallback(async (tag?: string | null) => {
    setDocsLoading(true)
    try {
      const url = tag ? `/api/docs?tag=${encodeURIComponent(tag)}` : '/api/docs'
      const res = await fetch(url)
      const data = await res.json()
      setDocs(data.docs || [])
      setAllTags(data.tags || [])
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const selectDoc = async (doc: DocFile) => {
    setSelectedDoc(doc)
    setContentLoading(true)
    setContent(null)
    setSearchResults(null)
    setSearchQuery('')
    try {
      const res = await fetch(`/api/docs?action=read&path=${encodeURIComponent(doc.path)}`)
      const data = await res.json()
      setContent(data.content || null)
    } catch {
      setContent('Error loading document.')
    } finally {
      setContentLoading(false)
    }
  }

  const onTagSelect = (tag: string | null) => {
    setSelectedTag(tag)
    loadDocs(tag)
    setSelectedDoc(null)
    setContent(null)
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/docs?action=search&q=${encodeURIComponent(q)}`)
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
    searchTimeoutRef.current = setTimeout(() => doSearch(value), 400)
  }

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString()
  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}K`

  const displayDocs = searchResults
    ? searchResults.map(r => ({ ...r, tags: [], size: 0, excerpt: r.snippets?.[0] }))
    : docs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#c9a84c' }}>📚 Docs</h2>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>workspace/docs</span>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '280px', marginLeft: 'auto' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchInput(e.target.value)}
            placeholder="Search docs..."
            style={{
              width: '100%', padding: '6px 32px 6px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', fontSize: '12px',
              color: 'rgba(255,255,255,0.8)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {isSearching && (
            <span style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '12px', color: 'rgba(255,255,255,0.3)',
            }}>⟳</span>
          )}
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '6px', flexWrap: 'wrap',
        }}>
          <button
            onClick={() => onTagSelect(null)}
            style={{
              padding: '3px 10px', fontSize: '11px',
              background: selectedTag === null ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${selectedTag === null ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px', cursor: 'pointer',
              color: selectedTag === null ? '#c9a84c' : 'rgba(255,255,255,0.5)',
            }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagSelect(tag)}
              style={{
                padding: '3px 10px', fontSize: '11px',
                background: selectedTag === tag ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${selectedTag === tag ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', cursor: 'pointer',
                color: selectedTag === tag ? '#c9a84c' : 'rgba(255,255,255,0.5)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Doc list */}
        <div style={{
          width: '280px', borderRight: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {docsLoading ? (
            <div style={{ padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading docs...</div>
          ) : displayDocs.length === 0 ? (
            <div style={{ padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              {searchQuery ? 'No results found' : 'No documents in workspace/docs/'}
            </div>
          ) : (
            displayDocs.map((doc: any) => (
              <div
                key={doc.path}
                onClick={() => selectDoc(doc)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  background: selectedDoc?.path === doc.path ? 'rgba(201,168,76,0.1)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (selectedDoc?.path !== doc.path) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (selectedDoc?.path !== doc.path) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: selectedDoc?.path === doc.path ? '#c9a84c' : 'rgba(255,255,255,0.85)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📝 {doc.title}
                </div>
                {doc.excerpt && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.excerpt}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {doc.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} style={{
                      padding: '1px 6px', fontSize: '9px',
                      background: 'rgba(201,168,76,0.1)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '8px', color: '#c9a84c',
                    }}>
                      {tag}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                    {doc.modified ? formatDate(doc.modified) : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Content viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedDoc ? (
            <>
              {/* Doc header */}
              <div style={{
                padding: '10px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#c9a84c' }}>{selectedDoc.title}</h3>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px', fontFamily: 'monospace' }}>
                    {selectedDoc.path} · {selectedDoc.modified ? formatDate(selectedDoc.modified) : ''} · {formatSize(selectedDoc.size || 0)}
                  </div>
                </div>
                <button
                  onClick={() => setViewMode(m => m === 'rendered' ? 'raw' : 'rendered')}
                  style={{
                    marginLeft: 'auto', padding: '4px 10px', fontSize: '11px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  }}
                >
                  {viewMode === 'rendered' ? '{ Raw }' : '⟨ Rendered ⟩'}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {contentLoading ? (
                  <div style={{ padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Loading...</div>
                ) : content === null ? (
                  <div style={{ padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Could not load document.</div>
                ) : viewMode === 'rendered' ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <pre style={{
                    margin: 0, padding: '24px',
                    fontSize: '12px', lineHeight: '1.7',
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
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', gap: '12px',
            }}>
              <span style={{ fontSize: '48px' }}>📚</span>
              <span style={{ fontSize: '14px' }}>Select a document to read</span>
              {docs.length === 0 && !docsLoading && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>
                  Add .md files to ~/.openclaw/workspace/docs/
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
