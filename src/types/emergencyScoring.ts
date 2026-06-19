// ============================================================
// 校護緊急救護情境評分表 - 型別定義
// ============================================================

/** 類別：內科 / 外科 */
export type Category = '內科' | '外科';

/** 單一步驟的評核狀態 */
export type StepStatus = '標準' | '不標準' | '錯誤' | '未操作';

/** 四種狀態的固定順序（用於迴圈與統計） */
export const STEP_STATUSES: StepStatus[] = ['標準', '不標準', '錯誤', '未操作'];

/** 大項（卡片）的評級結果 */
export type SectionGrade = '標準' | '不標準' | '錯誤';

/** 整體成績分級 */
export type Grade = '精熟' | '普通' | '不精熟' | '完全不熟';

/** 計時器狀態 */
export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

// ------------------------------------------------------------
// 情境資料結構（靜態，定義在 data/emergencyScenarios.ts）
// ------------------------------------------------------------

/** 單一必要步驟 */
export interface ScenarioStep {
  /** 在情境內唯一的步驟 id */
  id: string;
  /** 步驟說明文字 */
  text: string;
  /** 重大缺失：若漏做則列入 criticalMissCount */
  critical?: boolean;
  /** 所屬評估階段（如 primary、secondary、special） */
  phase?: string;
  /** 顯示排序提示 */
  order?: number;
  /** 步驟補充說明 */
  description?: string;
  /** 預設狀態（未設定則為「未操作」） */
  defaultStatus?: StepStatus;
}

/** 一個大項（一張卡片），包含多個步驟 */
export interface ScenarioSection {
  /** 在情境內唯一的大項 id */
  id: string;
  /** 大項標題 */
  title: string;
  /** 是否為該情境的特殊項目（用於視覺標示） */
  special?: boolean;
  /** 步驟清單 */
  steps: ScenarioStep[];
}

/** 一個完整情境 */
export interface Scenario {
  /** 全域唯一情境 id，例如 'med-hypoglycemia' */
  id: string;
  /** 類別 */
  category: Category;
  /** 情境名稱，例如 '低血糖' */
  name: string;
  /** 通用流程 + 特殊項目組成的所有大項 */
  sections: ScenarioSection[];
}

// ------------------------------------------------------------
// 作答 / 計分相關（執行期狀態）
// ------------------------------------------------------------

/**
 * 作答狀態：以 `${sectionId}__${stepId}` 為 key，
 * 對應每個步驟目前的評核狀態。
 */
export type AnswerMap = Record<string, StepStatus>;

/** 單一大項的統計與評級 */
export interface SectionResult {
  sectionId: string;
  title: string;
  total: number;
  standard: number;
  subStandard: number;
  error: number;
  notDone: number;
  grade: SectionGrade;
}

/** 整份評分表的彙總結果 */
export interface ScoreSummary {
  totalSteps: number;
  standardCount: number;
  subStandardCount: number;
  errorCount: number;
  notDoneCount: number;
  /** 重大缺失步驟數（critical:true 且非「標準」） */
  criticalMissCount: number;
  /** 完成率（0~1），預設為「標準步驟數 / 總步驟數」 */
  completionRate: number;
  grade: Grade;
  passed: boolean;
  /** 各大項的細部評級，可用於檢討 */
  sections: SectionResult[];
}

/** 一筆成績紀錄（儲存在 localStorage） */
export interface ScoreRecord {
  id: string;
  /** ISO 日期時間字串 */
  datetime: string;
  category: Category;
  scenario: string;
  scenarioId: string;
  totalSteps: number;
  standardCount: number;
  subStandardCount: number;
  errorCount: number;
  notDoneCount: number;
  /** 重大缺失步驟數 */
  criticalMissCount: number;
  /** 完成率（0~1） */
  completionRate: number;
  /** 使用時間（秒） */
  usedTimeSeconds: number;
  grade: Grade;
  passed: boolean;
  note: string;
}
