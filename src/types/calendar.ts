import { TaskStatus } from './database';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: 'task' | 'personal';
  // Task-specific
  projectName?: string;
  projectSlug?: string;
  projectId?: string;
  taskSlug?: string;
  taskStatus?: TaskStatus;
  // Personal-specific
  color?: string;
  description?: string;
  source?: 'internal' | 'external';
  googleEventId?: string;
  internalId?: string;
}

export interface PersonalEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export type CalendarViewMode = 'month' | 'week' | 'day';

// Color palette for projects
export const PROJECT_COLORS = [
  'hsl(221, 83%, 53%)',  // blue
  'hsl(142, 71%, 45%)',  // green
  'hsl(262, 83%, 58%)',  // purple
  'hsl(25, 95%, 53%)',   // orange
  'hsl(346, 77%, 49%)',  // rose
  'hsl(187, 85%, 43%)',  // cyan
  'hsl(47, 96%, 53%)',   // amber
  'hsl(316, 72%, 51%)',  // fuchsia
];

export function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export const EVENT_COLORS = [
  { label: 'Xanh dương', value: '#3b82f6' },
  { label: 'Xanh lá', value: '#22c55e' },
  { label: 'Tím', value: '#8b5cf6' },
  { label: 'Cam', value: '#f97316' },
  { label: 'Hồng', value: '#ec4899' },
  { label: 'Đỏ', value: '#ef4444' },
  { label: 'Vàng', value: '#eab308' },
  { label: 'Xám', value: '#6b7280' },
];
