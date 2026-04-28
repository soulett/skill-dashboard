import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DashboardEvent, DashboardEventType, ScanContext } from './types';

const EVENT_TYPES: DashboardEventType[] = [
  'home_recommendation_view',
  'scene_selected',
  'recommendation_clicked',
  'skill_detail_opened',
  'prompt_recommendation_requested',
  'prompt_recommendation_returned',
  'prompt_recommendation_clicked',
  'prompt_recommendation_fallback',
];
const EVENT_SET = new Set<DashboardEventType>(EVENT_TYPES);

export interface EventSummaryData {
  sampledEvents: number;
  recommendationViewCount: number;
  sceneSelectedCount: number;
  recommendationClickedCount: number;
  skillDetailOpenedCount: number;
  sceneClickRate: number;
  recommendationClickRate: number;
  detailOpenRate: number;
  updatedAt: string;
}

interface TrackEventInput {
  type: DashboardEventType;
  sceneId?: string;
  recommendedSkillId?: string;
  matchedSkillId?: string | null;
}

function clampRate(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function ensureDbDir(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function openDb(dbPath: string): DatabaseSync {
  ensureDbDir(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      scene_id TEXT,
      recommended_skill_id TEXT,
      matched_skill_id TEXT
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_dashboard_events_created_at ON dashboard_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_dashboard_events_type ON dashboard_events(type);
  `);
  return db;
}

function toSummary(counts: Record<DashboardEventType, number>): EventSummaryData {
  const recommendationViewCount = counts.home_recommendation_view;
  const sceneSelectedCount = counts.scene_selected;
  const recommendationClickedCount = counts.recommendation_clicked;
  const skillDetailOpenedCount = counts.skill_detail_opened;

  return {
    sampledEvents: recommendationViewCount + sceneSelectedCount + recommendationClickedCount + skillDetailOpenedCount,
    recommendationViewCount,
    sceneSelectedCount,
    recommendationClickedCount,
    skillDetailOpenedCount,
    sceneClickRate: clampRate(recommendationViewCount > 0 ? sceneSelectedCount / recommendationViewCount : 0),
    recommendationClickRate: clampRate(sceneSelectedCount > 0 ? recommendationClickedCount / sceneSelectedCount : 0),
    detailOpenRate: clampRate(recommendationClickedCount > 0 ? skillDetailOpenedCount / recommendationClickedCount : 0),
    updatedAt: new Date().toISOString(),
  };
}

export async function appendDashboardEvent(context: ScanContext, input: TrackEventInput): Promise<DashboardEvent> {
  if (!EVENT_SET.has(input.type)) {
    throw new Error('Unsupported event type');
  }

  const event: DashboardEvent = {
    id: crypto.randomUUID(),
    type: input.type,
    createdAt: new Date().toISOString(),
    ...(input.sceneId ? { sceneId: input.sceneId } : {}),
    ...(input.recommendedSkillId ? { recommendedSkillId: input.recommendedSkillId } : {}),
    ...(input.matchedSkillId !== undefined ? { matchedSkillId: input.matchedSkillId } : {}),
  };

  const db = openDb(context.eventsFilePath);
  try {
    const stmt = db.prepare(`
      INSERT INTO dashboard_events (id, type, created_at, scene_id, recommended_skill_id, matched_skill_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.type,
      event.createdAt,
      event.sceneId ?? null,
      event.recommendedSkillId ?? null,
      event.matchedSkillId ?? null,
    );
  } finally {
    db.close();
  }
  return event;
}

export async function getDashboardEventSummary(context: ScanContext, limit = 2000): Promise<EventSummaryData> {
  const db = openDb(context.eventsFilePath);
  try {
    const query = db.prepare(`
      SELECT type, COUNT(*) AS count
      FROM (
        SELECT type
        FROM dashboard_events
        ORDER BY created_at DESC
        LIMIT ?
      ) AS recent
      GROUP BY type
    `);
    const rows = query.all(limit) as Array<{ type: DashboardEventType; count: number }>;
    const counts: Record<DashboardEventType, number> = {
      home_recommendation_view: 0,
      scene_selected: 0,
      recommendation_clicked: 0,
      skill_detail_opened: 0,
      prompt_recommendation_requested: 0,
      prompt_recommendation_returned: 0,
      prompt_recommendation_clicked: 0,
      prompt_recommendation_fallback: 0,
    };
    for (const row of rows) {
      if (EVENT_SET.has(row.type)) counts[row.type] = row.count;
    }
    return toSummary(counts);
  } finally {
    db.close();
  }
}
