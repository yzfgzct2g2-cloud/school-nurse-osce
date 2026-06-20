// ============================================================
// 校護緊急救護情境評分表 - 測驗模式型別 v1.2.0
// ============================================================
import type { Category, Grade, AnswerMap, ScoreSummary } from './emergencyScoring';

/** 測驗模式 */
export type ExamMode = 'single' | 'dual' | 'custom' | 'formal';

/** 雙題子模式 */
export type DualSubMode = 'medSurg' | 'random' | 'userPick';

/** 計時模式 */
export type TimerMode = 'shared' | 'station';

/** 單站設定 */
export interface StationSetup {
  scenarioId: string;
}

/** 測驗設定（ExamSetup → ExamRunner） */
export interface ExamConfig {
  mode: ExamMode;
  dualSubMode: DualSubMode;   // 僅 mode === 'dual' 時有效
  timerMode: TimerMode;
  sharedDuration: number;     // 共用計時總秒數
  stationDuration: number;    // 分站計時每站秒數
  stations: StationSetup[];
}

/** 預設設定 */
export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  mode: 'formal',
  dualSubMode: 'medSurg',
  timerMode: 'station',
  sharedDuration: 24 * 60,
  stationDuration: 12 * 60,
  stations: [],
};

/** 單站執行結果 */
export interface StationResult {
  stationIndex: number;
  scenarioId: string;
  scenarioName: string;
  category: Category;
  answers: AnswerMap;
  summary: ScoreSummary;
  usedSeconds: number;
  /** false = 時間到強制結束或跳過 */
  completed: boolean;
}

/** 整份測驗歷史紀錄（儲存於 localStorage） */
export interface ExamRecord {
  id: string;
  datetime: string;
  mode: ExamMode;
  dualSubMode?: DualSubMode;
  timerMode: TimerMode;
  stations: StationResult[];
  overallCompletionRate: number;
  totalCriticalMiss: number;
  overallGrade: Grade;
  passed: boolean;
  note: string;
}

// ---- 顯示標籤 ----
export const EXAM_MODE_LABELS: Record<ExamMode, string> = {
  single:  '單題模式',
  dual:    '雙題模式',
  custom:  '自選模式',
  formal:  '正式測驗模式',
};

export const DUAL_SUB_LABELS: Record<DualSubMode, string> = {
  medSurg:  'A：內科一題 ＋ 外科一題（隨機）',
  random:   'B：全部題庫任意抽兩題',
  userPick: 'C：自選兩題',
};

export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  shared:  '共用計時（全程一個計時器）',
  station: '分站計時（每站獨立計時）',
};
