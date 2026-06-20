// ============================================================
// 校護緊急救護情境評分表 - 測驗結果頁 v1.2.0
// ============================================================
import { useMemo } from 'react';
import type { ExamConfig, ExamRecord, StationResult } from '../types/examMode';
import { DUAL_SUB_LABELS, EXAM_MODE_LABELS, TIMER_MODE_LABELS } from '../types/examMode';
import { computeGrade, isPassing } from '../utils/emergencyScore';
import { formatTime } from './EmergencyTimer';

interface ExamResultsProps {
  config: ExamConfig;
  stationResults: StationResult[];
  onSave: (record: ExamRecord) => void;
  onRetry: () => void;
  onHome: () => void;
}

const GRADE_CLASS: Record<string, string> = {
  精熟: 'grade-badge grade-badge--精熟',
  普通: 'grade-badge grade-badge--普通',
  不精熟: 'grade-badge grade-badge--不精熟',
  完全不熟: 'grade-badge grade-badge--完全不熟',
};

export function ExamResults({
  config,
  stationResults,
  onSave,
  onRetry,
  onHome,
}: ExamResultsProps) {
  // ─── 計算綜合成績 ─────────────────────────────────────────────
  const overall = useMemo(() => {
    const completed = stationResults.filter((r) => r.completed);
    const totalSteps = stationResults.reduce((s, r) => s + r.summary.totalSteps, 0);
    const totalStandard = stationResults.reduce((s, r) => s + r.summary.standardCount, 0);
    const totalCritical = stationResults.reduce((s, r) => s + r.summary.criticalMissCount, 0);
    const totalTime = stationResults.reduce((s, r) => s + r.usedSeconds, 0);
    const rate = totalSteps > 0 ? totalStandard / totalSteps : 0;
    const grade = computeGrade(rate, totalCritical);
    return {
      completionRate: rate,
      totalCriticalMiss: totalCritical,
      grade,
      passed: isPassing(grade),
      completedStations: completed.length,
      totalTime,
    };
  }, [stationResults]);

  function handleSave() {
    const record: ExamRecord = {
      id: `exam-${Date.now()}`,
      datetime: new Date().toISOString(),
      mode: config.mode,
      dualSubMode: config.mode === 'dual' ? config.dualSubMode : undefined,
      timerMode: config.timerMode,
      stations: stationResults,
      overallCompletionRate: overall.completionRate,
      totalCriticalMiss: overall.totalCriticalMiss,
      overallGrade: overall.grade,
      passed: overall.passed,
      note: '',
    };
    onSave(record);
  }

  const modeLabel =
    config.mode === 'dual'
      ? `${EXAM_MODE_LABELS[config.mode]} — ${DUAL_SUB_LABELS[config.dualSubMode]}`
      : EXAM_MODE_LABELS[config.mode];

  return (
    <div className="exam-results">
      {/* ===== 標頭 ===== */}
      <div className="exam-results__header">
        <h1 className="exam-results__title">測驗結果</h1>
        <div className="exam-results__meta">
          <span>{modeLabel}</span>
          <span className="exam-results__sep">|</span>
          <span>{TIMER_MODE_LABELS[config.timerMode].split('（')[0]}</span>
          <span className="exam-results__sep">|</span>
          <span>{stationResults.length} 站</span>
        </div>
      </div>

      {/* ===== 綜合成績卡 ===== */}
      <div
        className={`exam-results__overall ${
          overall.passed ? 'exam-results__overall--pass' : 'exam-results__overall--fail'
        }`}
      >
        <div className="exam-results__overall-label">綜合成績</div>
        <div className="exam-results__overall-grade">
          <span className={GRADE_CLASS[overall.grade]}>{overall.grade}</span>
          {overall.passed ? (
            <span className="pass-badge pass-badge--lg">通過</span>
          ) : (
            <span className="fail-badge fail-badge--lg">未通過</span>
          )}
        </div>
        <div className="exam-results__overall-stats">
          <div className="overall-stat">
            <span className="overall-stat__label">完成率</span>
            <span className="overall-stat__value">
              {(overall.completionRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="overall-stat">
            <span className="overall-stat__label">重大缺失</span>
            <span
              className={`overall-stat__value ${
                overall.totalCriticalMiss > 0 ? 'text--warn' : ''
              }`}
            >
              {overall.totalCriticalMiss}
            </span>
          </div>
          <div className="overall-stat">
            <span className="overall-stat__label">完成站別</span>
            <span className="overall-stat__value">
              {overall.completedStations} / {stationResults.length}
            </span>
          </div>
          <div className="overall-stat">
            <span className="overall-stat__label">總計用時</span>
            <span className="overall-stat__value">{formatTime(overall.totalTime)}</span>
          </div>
        </div>
      </div>

      {/* ===== 各站明細 ===== */}
      <h2 className="exam-results__section-title">各站成績明細</h2>
      <div className="exam-results__stations">
        {stationResults.map((r, idx) => (
          <div
            key={idx}
            className={`station-result ${r.completed ? '' : 'station-result--incomplete'}`}
          >
            <div className="station-result__head">
              <span className="station-result__num">第 {idx + 1} 站</span>
              <span className="station-result__cat">{r.category}</span>
              <span className="station-result__name">{r.scenarioName}</span>
              {!r.completed && (
                <span className="station-result__incomplete-badge">未完成</span>
              )}
            </div>
            <div className="station-result__stats">
              <div className="station-stat">
                <span>完成率</span>
                <strong>{(r.summary.completionRate * 100).toFixed(0)}%</strong>
              </div>
              <div className="station-stat">
                <span>標準</span>
                <strong>{r.summary.standardCount}</strong>
              </div>
              <div className="station-stat">
                <span>不標準</span>
                <strong>{r.summary.subStandardCount}</strong>
              </div>
              <div className="station-stat">
                <span>錯誤</span>
                <strong>{r.summary.errorCount}</strong>
              </div>
              <div className="station-stat">
                <span>未操作</span>
                <strong>{r.summary.notDoneCount}</strong>
              </div>
              <div className="station-stat">
                <span>重大缺失</span>
                <strong
                  className={r.summary.criticalMissCount > 0 ? 'text--warn' : ''}
                >
                  {r.summary.criticalMissCount}
                </strong>
              </div>
              <div className="station-stat">
                <span>分級</span>
                <strong>
                  <span className={GRADE_CLASS[r.summary.grade]}>{r.summary.grade}</span>
                </strong>
              </div>
              <div className="station-stat">
                <span>用時</span>
                <strong>{formatTime(r.usedSeconds)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 操作按鈕 ===== */}
      <div className="exam-results__actions">
        <button className="btn btn--primary" onClick={handleSave}>
          儲存紀錄
        </button>
        <button className="btn" onClick={onRetry}>
          重新測驗
        </button>
        <button className="btn btn--ghost" onClick={onHome}>
          返回首頁
        </button>
      </div>
    </div>
  );
}
