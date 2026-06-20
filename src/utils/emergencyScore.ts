// ============================================================
// 校護緊急救護情境評分表 - 計分與分級邏輯 v1.1.0
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
// ------------------------------------------------------------
export const SCORING_CONFIG = {
  /**
   * 大項（卡片）評級門檻，依「該大項內錯誤步驟數」判定：
   *   錯誤步驟數 >= sectionErrorThreshold      → 該大項「錯誤」
   *   錯誤步驟數 >= sectionSubStandardThreshold → 該大項「不標準」
   *   其餘                                      → 該大項「標準」
   */
  sectionSubStandardThreshold: 1,
  sectionErrorThreshold: 2,

  /**
   * 整體分級：依「標準率」與「重大缺失數」判定（由上而下，先符合者優先）
   *
   * 精熟     ：標準率 >= 90% 且 重大缺失 = 0
   * 普通     ：標準率 >= 75% 且 重大缺失 <= 1
   * 不精熟   ：標準率 >= 60% 或 重大缺失 = 2（且未達上面等級）
   * 完全不熟 ：標準率 < 60% 或 重大缺失 >= 3
   */
  grade: {
    精熟: { minCompletion: 0.9, maxCriticalMiss: 0 },
    普通: { minCompletion: 0.75, maxCriticalMiss: 1 },
    不精熟: { minCompletion: 0.6, maxCriticalMiss: 2 },
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

/**
 * 整體分級：
 * - 完全不熟優先（rate < 60% 或 criticalMiss >= 3）
 * - 再依精熟→普通→不精熟→完全不熟排序
 */
function gradeOverall(completionRate: number, criticalMiss: number): Grade {
  // 完全不熟：任一條件成立即降至最低等級
  if (completionRate < SCORING_CONFIG.grade.不精熟.minCompletion || criticalMiss > SCORING_CONFIG.grade.不精熟.maxCriticalMiss) {
    return '完全不熟';
  }
  if (
    completionRate >= SCORING_CONFIG.grade.精熟.minCompletion &&
    criticalMiss <= SCORING_CONFIG.grade.精熟.maxCriticalMiss
  ) {
    return '精熟';
  }
  if (
    completionRate >= SCORING_CONFIG.grade.普通.minCompletion &&
    criticalMiss <= SCORING_CONFIG.grade.普通.maxCriticalMiss
  ) {
    return '普通';
  }
  return '不精熟';
}

/** 是否通過 */
export function isPassing(grade: Grade): boolean {
  return SCORING_CONFIG.passingGrades.includes(grade);
}

/** 對外暴露整體分級函式（供多站綜合計分使用） */
export function computeGrade(completionRate: number, criticalMissCount: number): Grade {
  return gradeOverall(completionRate, criticalMissCount);
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
  let criticalMissCount = 0;

  for (const sec of scenario.sections) {
    let s = 0;
    let sub = 0;
    let err = 0;
    let nd = 0;

    for (const step of sec.steps) {
      const status = answers[stepKey(sec.id, step.id)] ?? '未操作';
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
      // 重大缺失：critical 步驟且非「標準」
      if (step.critical && status !== '標準') {
        criticalMissCount += 1;
      }
    }

    const sectionTotal = sec.steps.length;
    sections.push({
      sectionId: sec.id,
      title: sec.title,
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
  const grade = gradeOverall(completionRate, criticalMissCount);

  return {
    totalSteps,
    standardCount,
    subStandardCount,
    errorCount,
    notDoneCount,
    criticalMissCount,
    completionRate,
    grade,
    passed: isPassing(grade),
    sections,
  };
}
