// ============================================================
// 校護緊急救護情境評分表 - 計分與分級邏輯
// ============================================================
import type {
  AnswerMap,
  Grade,
  Scenario,
  ScoreSummary,
  SectionGrade,
  SectionResult,
} from '../types/emergencyScoring';

// ------------------------------------------------------------
// ★★★ 通過標準設定區塊（非程式人員亦可在此調整）★★★
// 調整下列數值即可改變大項評級與整體分級的判定標準。
// ------------------------------------------------------------
export const SCORING_CONFIG = {
  /**
   * 大項（卡片）評級門檻，依「該大項內錯誤步驟數」判定：
   *   錯誤步驟數 >= sectionErrorThreshold      → 該大項「錯誤」
   *   錯誤步驟數 >= sectionSubStandardThreshold → 該大項「不標準」
   *   其餘                                      → 該大項「標準」
   *
   * 預設：錯 1 項 = 不標準，錯 2 項（含）以上 = 錯誤。
   */
  sectionSubStandardThreshold: 1,
  sectionErrorThreshold: 2,

  /**
   * 整體分級門檻。
   * 由上而下逐一比對，第一個全部符合的等級即為結果。
   * - minCompletion：完成率下限（完成率 = 標準步驟數 / 總步驟數）
   * - maxErrorSteps：允許的「錯誤」狀態步驟數上限
   * - maxErrorSections：允許被評為「錯誤」的大項數上限
   */
  grade: {
    精熟: { minCompletion: 0.9, maxErrorSteps: 0, maxErrorSections: 0 },
    普通: { minCompletion: 0.75, maxErrorSteps: 2, maxErrorSections: 1 },
    不精熟: { minCompletion: 0.5, maxErrorSteps: 5, maxErrorSections: 3 },
    // 未達「不精熟」門檻者一律為「完全不熟」
  },

  /** 視為通過的分級 */
  passingGrades: ['精熟', '普通'] as Grade[],
};
// ------------------------------------------------------------
// 設定區塊結束
// ------------------------------------------------------------

/** 組成作答 map 的 key */
export function stepKey(sectionId: string, stepId: string): string {
  return `${sectionId}__${stepId}`;
}

/** 依設定，由某大項的錯誤步驟數判定該大項評級 */
function gradeSection(errorSteps: number): SectionGrade {
  if (errorSteps >= SCORING_CONFIG.sectionErrorThreshold) return '錯誤';
  if (errorSteps >= SCORING_CONFIG.sectionSubStandardThreshold) return '不標準';
  return '標準';
}

/** 依整體統計判定整體分級 */
function gradeOverall(
  completionRate: number,
  errorSteps: number,
  errorSections: number,
): Grade {
  const g = SCORING_CONFIG.grade;
  if (
    completionRate >= g.精熟.minCompletion &&
    errorSteps <= g.精熟.maxErrorSteps &&
    errorSections <= g.精熟.maxErrorSections
  ) {
    return '精熟';
  }
  if (
    completionRate >= g.普通.minCompletion &&
    errorSteps <= g.普通.maxErrorSteps &&
    errorSections <= g.普通.maxErrorSections
  ) {
    return '普通';
  }
  if (
    completionRate >= g.不精熟.minCompletion &&
    errorSteps <= g.不精熟.maxErrorSteps &&
    errorSections <= g.不精熟.maxErrorSections
  ) {
    return '不精熟';
  }
  return '完全不熟';
}

/** 是否通過 */
export function isPassing(grade: Grade): boolean {
  return SCORING_CONFIG.passingGrades.includes(grade);
}

/**
 * 核心計分：依情境與作答狀態，計算整份評分表的彙總結果。
 * 未填狀態的步驟一律視為「未操作」。
 */
export function computeScore(scenario: Scenario, answers: AnswerMap): ScoreSummary {
  const sections: SectionResult[] = [];

  let totalSteps = 0;
  let standardCount = 0;
  let subStandardCount = 0;
  let errorCount = 0;
  let notDoneCount = 0;

  for (const section of scenario.sections) {
    let s = 0;
    let sub = 0;
    let err = 0;
    let nd = 0;

    for (const step of section.steps) {
      const status = answers[stepKey(section.id, step.id)] ?? '未操作';
      switch (status) {
        case '標準':
          s += 1;
          break;
        case '不標準':
          sub += 1;
          break;
        case '錯誤':
          err += 1;
          break;
        default:
          nd += 1;
      }
    }

    const sectionTotal = section.steps.length;
    sections.push({
      sectionId: section.id,
      title: section.title,
      total: sectionTotal,
      standard: s,
      subStandard: sub,
      error: err,
      notDone: nd,
      grade: gradeSection(err),
    });

    totalSteps += sectionTotal;
    standardCount += s;
    subStandardCount += sub;
    errorCount += err;
    notDoneCount += nd;
  }

  const completionRate = totalSteps === 0 ? 0 : standardCount / totalSteps;
  const errorSections = sections.filter((sec) => sec.grade === '錯誤').length;
  const grade = gradeOverall(completionRate, errorCount, errorSections);

  return {
    totalSteps,
    standardCount,
    subStandardCount,
    errorCount,
    notDoneCount,
    completionRate,
    grade,
    passed: isPassing(grade),
    sections,
  };
}
