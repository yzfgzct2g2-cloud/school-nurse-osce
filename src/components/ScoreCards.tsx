// ============================================================
// 校護緊急救護情境評分表 - 評分卡片（共用純渲染元件）v1.2.0
// EmergencyScoreSheet 與 ExamRunner 共同使用
// ============================================================
import { useMemo } from 'react';
import { computeScore, stepKey } from '../utils/emergencyScore';
import type { AnswerMap, Scenario, ScoreSummary, SectionGrade, StepStatus } from '../types/emergencyScoring';
import { STEP_STATUSES } from '../types/emergencyScoring';

const SECTION_GRADE_CLASS: Record<SectionGrade, string> = {
  標準:  'chip chip--standard',
  不標準: 'chip chip--sub',
  錯誤:  'chip chip--error',
};

const STATUS_CLASS: Record<StepStatus, string> = {
  標準:  'seg seg--standard',
  不標準: 'seg seg--sub',
  錯誤:  'seg seg--error',
  未操作: 'seg seg--none',
};

export interface ScoreCardsProps {
  scenario: Scenario;
  answers: AnswerMap;
  onAnswersChange: (next: AnswerMap) => void;
  /** 唯讀模式（測驗已結束） */
  disabled?: boolean;
}

/** ScoreCards 回傳當前 summary，讓父層也能使用（避免重複計算） */
export interface ScoreCardsHandle {
  summary: ScoreSummary;
}

export function ScoreCards({
  scenario,
  answers,
  onAnswersChange,
  disabled = false,
}: ScoreCardsProps) {
  const summary = useMemo(() => computeScore(scenario, answers), [scenario, answers]);

  function setStatus(sectionId: string, stepId: string, status: StepStatus) {
    if (disabled) return;
    onAnswersChange({ ...answers, [stepKey(sectionId, stepId)]: status });
  }

  function toggleDone(sectionId: string, stepId: string) {
    if (disabled) return;
    const key = stepKey(sectionId, stepId);
    const cur = answers[key] ?? '未操作';
    onAnswersChange({ ...answers, [key]: cur === '標準' ? '未操作' : '標準' });
  }

  function sectionAllStandard(sectionId: string) {
    if (disabled) return;
    const sec = scenario.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const next = { ...answers };
    for (const step of sec.steps) next[stepKey(sectionId, step.id)] = '標準';
    onAnswersChange(next);
  }

  function clearSection(sectionId: string) {
    if (disabled) return;
    const sec = scenario.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const next = { ...answers };
    for (const step of sec.steps) delete next[stepKey(sectionId, step.id)];
    onAnswersChange(next);
  }

  return (
    <div className="cards">
      {scenario.sections.map((sec) => {
        const secResult = summary.sections.find((r) => r.sectionId === sec.id);
        return (
          <section
            key={sec.id}
            className={`card ${sec.special ? 'card--special' : ''}`}
          >
            <div className="card__head">
              <h2 className="card__title">
                {sec.title}
                {sec.special && <span className="badge">情境特殊</span>}
              </h2>
              {secResult && (
                <span className={SECTION_GRADE_CLASS[secResult.grade]}>
                  {secResult.grade}
                </span>
              )}
              {!disabled && (
                <div className="card__actions">
                  <button
                    className="btn btn--mini"
                    onClick={() => sectionAllStandard(sec.id)}
                  >
                    全選標準
                  </button>
                  <button
                    className="btn btn--mini btn--ghost"
                    onClick={() => clearSection(sec.id)}
                  >
                    清除
                  </button>
                </div>
              )}
            </div>

            <ul className="steps">
              {sec.steps.map((step) => {
                const status: StepStatus =
                  answers[stepKey(sec.id, step.id)] ?? '未操作';
                const done = status === '標準';
                return (
                  <li
                    key={step.id}
                    className={`step ${step.critical ? 'step--critical' : ''}`}
                  >
                    {step.critical && (
                      <span
                        className="step__critical-badge"
                        title="重大缺失項目：漏做將影響分級"
                      >
                        ！
                      </span>
                    )}
                    <input
                      type="checkbox"
                      className="step__check"
                      checked={done}
                      disabled={disabled}
                      onChange={() => toggleDone(sec.id, step.id)}
                      aria-label={`完成：${step.text}`}
                    />
                    <button
                      type="button"
                      className={`step__text ${done ? 'step__text--done' : ''}`}
                      onClick={() => toggleDone(sec.id, step.id)}
                      disabled={disabled}
                    >
                      {step.text}
                    </button>
                    <div className="step__status" role="group" aria-label="評核狀態">
                      {STEP_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={`${STATUS_CLASS[st]} ${status === st ? 'seg--active' : ''}`}
                          onClick={() => setStatus(sec.id, step.id, st)}
                          disabled={disabled}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** 由父層傳入 answers 取得即時 summary（省去重複 useMemo） */
export function useScoreSummary(scenario: Scenario, answers: AnswerMap): ScoreSummary {
  return useMemo(() => computeScore(scenario, answers), [scenario, answers]);
}
