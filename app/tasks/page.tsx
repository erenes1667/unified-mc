'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  column: string;
}

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];
const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ef4444', P1: '#f59e0b', P2: '#3b82f6', P3: '#6b7280',
};

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Configure API integrations', assignee: 'Atlas', priority: 'P0', column: 'In Progress' },
  { id: '2', title: 'Set up email monitoring', assignee: 'Atlas', priority: 'P1', column: 'Backlog' },
  { id: '3', title: 'Build client dashboard', assignee: 'Atlas', priority: 'P1', column: 'Backlog' },
  { id: '4', title: 'Review onboarding flow', assignee: 'You', priority: 'P0', column: 'Review' },
  { id: '5', title: 'Install OpenClaw gateway', assignee: 'System', priority: 'P0', column: 'Done' },
  { id: '6', title: 'Connect Gmail (read-only)', assignee: 'Atlas', priority: 'P2', column: 'Backlog' },
  { id: '7', title: 'Set up cron schedules', assignee: 'Atlas', priority: 'P1', column: 'In Progress' },
  { id: '8', title: 'Test chat WebSocket', assignee: 'System', priority: 'P0', column: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [dragId, setDragId] = useState<string | null>(null);

  const moveTask = (taskId: string, newColumn: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: newColumn } : t));
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>✅ Tasks</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Drag tasks between columns to update status
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minHeight: '70vh' }}>
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.column === col);
          return (
            <div
              key={col}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragId) moveTask(dragId, col); setDragId(null); }}
              className="glass"
              style={{ borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {col}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 10 }}>
                  {colTasks.length}
                </span>
              </div>
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  className="glass glass-hover"
                  style={{
                    padding: '12px 14px', borderRadius: 8, cursor: 'grab',
                    borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{task.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{task.assignee}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: `${PRIORITY_COLORS[task.priority]}22`,
                      color: PRIORITY_COLORS[task.priority],
                    }}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
