import { NextResponse } from 'next/server';

export interface CronJob {
  id: string;
  name: string;
  model: string;
  type: 'research' | 'ops' | 'strategy' | 'build' | 'backup';
  days: number[]; // 0=Mon .. 6=Sun
  hours: number[];
  minute: number;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];

const CRON_JOBS: CronJob[] = [
  {
    id: 'market-research',
    name: 'Market Research Weekly',
    model: 'Kimi K2.5',
    type: 'research',
    days: [0],
    hours: [10],
    minute: 0,
  },
  {
    id: 'reddit-youtube',
    name: 'Reddit + YouTube Digest',
    model: 'Kimi K2.5',
    type: 'research',
    days: ALL_DAYS,
    hours: [17],
    minute: 0,
  },
  {
    id: 'newsletter-digest',
    name: 'Newsletter Inbox Digest',
    model: 'Kimi K2.5',
    type: 'research',
    days: ALL_DAYS,
    hours: [20],
    minute: 0,
  },
  {
    id: 'nightly-build',
    name: 'Nightly Build',
    model: 'Sonnet',
    type: 'build',
    days: ALL_DAYS,
    hours: [23],
    minute: 0,
  },
  {
    id: 'dayflow-analysis',
    name: 'Dayflow Analysis',
    model: 'Sonnet',
    type: 'ops',
    days: ALL_DAYS,
    hours: [23],
    minute: 15,
  },
  {
    id: 'second-brain',
    name: 'Second Brain Journal',
    model: 'Sonnet',
    type: 'ops',
    days: ALL_DAYS,
    hours: [23],
    minute: 45,
  },
  {
    id: 'cleon-strategy',
    name: 'Cleon Weekly Strategy Review',
    model: 'Opus',
    type: 'strategy',
    days: [6],
    hours: [11],
    minute: 0,
  },
  {
    id: 'harvest-reminder',
    name: 'Harvest Timesheet Reminder',
    model: 'System',
    type: 'ops',
    days: ALL_DAYS,
    hours: [9],
    minute: 15,
  },
  {
    id: 'o7-timesheet',
    name: 'O7 Timesheet Fill',
    model: 'Sonnet',
    type: 'ops',
    days: WEEKDAYS,
    hours: [19],
    minute: 0,
  },
  {
    id: 'icloud-backup',
    name: 'iCloud Backup',
    model: 'System',
    type: 'backup',
    days: ALL_DAYS,
    hours: [3],
    minute: 0,
  },
  {
    id: 'citadel-backup',
    name: 'Citadel Backup',
    model: 'System',
    type: 'backup',
    days: ALL_DAYS,
    hours: [4],
    minute: 15,
  },
  {
    id: 'demerzel-monitor',
    name: 'Demerzel Monitor',
    model: 'Haiku',
    type: 'ops',
    days: ALL_DAYS,
    hours: [0, 4, 8, 12, 16, 20],
    minute: 0,
  },
];

export async function GET() {
  return NextResponse.json({ jobs: CRON_JOBS });
}
