'use client';

import { useState, useEffect, useCallback } from 'react';

type Status = 'planning' | 'building' | 'testing' | 'live' | 'paused';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface Milestone { title: string; done: boolean; }

interface Project {
  id: string; name: string; description: string; priority: Priority;
  status: Status; mrr: number | null; mrrPotential: number | null;
  owner: string; milestones: Milestone[]; tags: string[];
  createdAt: string; updatedAt: string;
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planning', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  building: { label: 'Building', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  testing: { label: 'Testing', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  live: { label: 'Live', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  paused: { label: 'Paused', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const PRI_COLORS: Record<Priority, string> = { P0: '#ef4444', P1: '#f59e0b', P2: '#3b82f6', P3: '#6b7280' };
const STATUSES: Status[] = ['planning', 'building', 'testing', 'live', 'paused'];
const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  background: `${color}18`, border: `1px solid ${color}40`, color,
});

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'mrr' | 'progress'>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMs, setNewMs] = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', description: '', priority: 'P1' as Priority, status: 'planning' as Status, mrrPotential: '', owner: 'You', tags: '' });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) { const data = await res.json(); setProjects(data); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const saveProject = async (project: Partial<Project> & { id?: string }) => {
    if (project.id) {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
      if (res.ok) await fetchProjects();
    } else {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
      if (res.ok) await fetchProjects();
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    await fetchProjects();
    if (expandedId === id) setExpandedId(null);
  };

  const toggleMilestone = async (projectId: string, msIdx: number) => {
    const p = projects.find(x => x.id === projectId);
    if (!p) return;
    const ms = [...p.milestones];
    ms[msIdx] = { ...ms[msIdx], done: !ms[msIdx].done };
    await saveProject({ id: projectId, milestones: ms });
  };

  const addMilestone = async (projectId: string) => {
    if (!newMs.trim()) return;
    const p = projects.find(x => x.id === projectId);
    if (!p) return;
    const ms = [...p.milestones, { title: newMs.trim(), done: false }];
    await saveProject({ id: projectId, milestones: ms });
    setNewMs('');
  };

  const removeMilestone = async (projectId: string, msIdx: number) => {
    const p = projects.find(x => x.id === projectId);
    if (!p) return;
    const ms = p.milestones.filter((_, i) => i !== msIdx);
    await saveProject({ id: projectId, milestones: ms });
  };

  const submitNewProject = async () => {
    await saveProject({
      name: form.name, description: form.description, priority: form.priority,
      status: form.status, mrrPotential: form.mrrPotential ? Number(form.mrrPotential) : null,
      owner: form.owner, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), milestones: [],
    });
    setForm({ name: '', description: '', priority: 'P1', status: 'planning', mrrPotential: '', owner: 'You', tags: '' });
    setShowAdd(false);
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, priority: p.priority, status: p.status, mrrPotential: p.mrrPotential?.toString() || '', owner: p.owner, tags: p.tags.join(', ') });
  };

  const submitEdit = async () => {
    if (!editingId) return;
    await saveProject({
      id: editingId, name: form.name, description: form.description, priority: form.priority,
      status: form.status, mrrPotential: form.mrrPotential ? Number(form.mrrPotential) : null,
      owner: form.owner, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingId(null);
    setForm({ name: '', description: '', priority: 'P1', status: 'planning', mrrPotential: '', owner: 'You', tags: '' });
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    if (sortBy === 'mrr') return (b.mrrPotential ?? 0) - (a.mrrPotential ?? 0);
    const pctA = a.milestones.length ? a.milestones.filter(m => m.done).length / a.milestones.length : 0;
    const pctB = b.milestones.length ? b.milestones.filter(m => m.done).length / b.milestones.length : 0;
    return pctB - pctA;
  });

  const totalMRR = projects.reduce((s, p) => s + (p.mrr ?? 0), 0);
  const totalPotential = projects.reduce((s, p) => s + (p.mrrPotential ?? 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => {
    return s + (p.milestones.length ? (p.milestones.filter(m => m.done).length / p.milestones.length) * 100 : 0);
  }, 0) / projects.length) : 0;

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading projects...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>Projects & Roadmap</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Track milestones, priority, and revenue potential</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); }} style={btnStyle('var(--gold)')}>
          {showAdd ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editingId) && (
        <div className="glass" style={{ borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>
            {editingId ? 'Edit Project' : 'New Project'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Owner</label>
              <input style={inputStyle} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Who owns this" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Priority</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>MRR Potential ($)</label>
              <input style={inputStyle} type="number" value={form.mrrPotential} onChange={e => setForm({ ...form, mrrPotential: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Tags (comma-separated)</label>
              <input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="revenue, client" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={editingId ? submitEdit : submitNewProject} disabled={!form.name.trim()} style={{ ...btnStyle('#34d399'), opacity: form.name.trim() ? 1 : 0.4 }}>
              {editingId ? 'Save Changes' : 'Create Project'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} style={btnStyle('var(--muted)')}>Cancel</button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cyan)' }}>{projects.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active Projects</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>${totalMRR.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current MRR</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>${totalPotential.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>MRR Potential</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{avgProgress}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Avg Progress</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', ...STATUSES] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="glass glass-hover" style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
              color: filter === f ? 'var(--gold)' : 'var(--muted)',
              background: filter === f ? 'rgba(201,168,76,0.1)' : 'var(--glass)',
              borderColor: filter === f ? 'rgba(201,168,76,0.2)' : 'transparent',
            }}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Sort:</span>
          {(['priority', 'mrr', 'progress'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit',
              background: sortBy === s ? 'rgba(201,168,76,0.15)' : 'transparent',
              border: `1px solid ${sortBy === s ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
              color: sortBy === s ? 'var(--gold)' : 'var(--muted)',
            }}>{s === 'mrr' ? 'MRR' : s}</button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Create your first project to start tracking milestones and MRR</div>
          <button onClick={() => setShowAdd(true)} style={btnStyle('var(--gold)')}>+ New Project</button>
        </div>
      )}

      {/* Project List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(project => {
          const doneCount = project.milestones.filter(m => m.done).length;
          const totalCount = project.milestones.length;
          const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
          const isExpanded = expandedId === project.id;
          const sc = STATUS_CFG[project.status];
          const isEditing = editingId === project.id;

          return (
            <div key={project.id} className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
              {/* Header */}
              <div onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : project.id); }}
                style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }} className="glass-hover">
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${PRI_COLORS[project.priority]}15`, border: `1px solid ${PRI_COLORS[project.priority]}40`,
                  color: PRI_COLORS[project.priority], fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{project.priority}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{project.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                    {project.tags.map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{project.description}</div>
                  {totalCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct === 100 ? '#34d399' : 'linear-gradient(90deg, var(--gold), var(--cyan))', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{doneCount}/{totalCount} ({pct}%)</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {project.mrrPotential != null && project.mrrPotential > 0 && (
                    <><div style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>${project.mrrPotential.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>MRR potential</div></>
                  )}
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginTop: 4 }}>&#9654;</span>
              </div>

              {/* Expanded */}
              {isExpanded && !isEditing && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>Roadmap</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(project); setShowAdd(false); }} style={btnStyle('var(--cyan)')}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} style={btnStyle('#ef4444')}>Delete</button>
                    </div>
                  </div>
                  {/* Milestones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {project.milestones.map((ms, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, fontSize: 13,
                        background: ms.done ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${ms.done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)'}`,
                      }}>
                        <span onClick={() => toggleMilestone(project.id, i)} style={{
                          width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          background: ms.done ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${ms.done ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          fontSize: 11, color: ms.done ? '#34d399' : 'transparent',
                        }}>&#10003;</span>
                        <span style={{ flex: 1, color: ms.done ? 'var(--muted)' : 'var(--text)', textDecoration: ms.done ? 'line-through' : 'none' }}>{ms.title}</span>
                        <button onClick={() => removeMilestone(project.id, i)} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: 0.6 }}>remove</button>
                      </div>
                    ))}
                  </div>
                  {/* Add milestone */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} value={newMs} onChange={e => setNewMs(e.target.value)} placeholder="Add a milestone..." onKeyDown={e => { if (e.key === 'Enter') addMilestone(project.id); }} />
                    <button onClick={() => addMilestone(project.id)} disabled={!newMs.trim()} style={{ ...btnStyle('var(--gold)'), opacity: newMs.trim() ? 1 : 0.4 }}>Add</button>
                  </div>
                  {/* Timeline info */}
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                    <span>Owner: {project.owner}</span>
                    {totalCount > 0 && <span>Progress: {pct}%</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
