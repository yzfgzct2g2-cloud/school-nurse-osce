// ============================================================
// 校護緊急救護情境評分表 - 測驗執行器 v1.2.0
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getScenario } from '../data/emergencyScenarios';
import type { AnswerMap } from '../types/emergencyScoring';
import type { ExamConfig, StationResult } from '../types/examMode';
import { EXAM_MODE_LABELS, TIMER_MODE_LABELS } from '../types/examMode';
import { computeScore } from '../utils/emergencyScore';
import { formatTime, useCountdown } from './EmergencyTimer';
import { ScoreCards, useScoreSummary } from './ScoreCards';

interface ExamRunnerProps {
  config: ExamConfig;
  onComplete: (results: StationResult[]) => void;
  onAbort: () => void;
}

export function ExamRunner({ config, onComplete, onAbort }: ExamRunnerProps) {
  const { stations, timerMode, sharedDuration, stationDuration } = config;
  const stationCount = stations.length;

  // ─── 站別狀態 ───────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allAnswers, setAllAnswers] = useState<AnswerMap[]>(() =>
    stations.map(() => ({})),
  );
  // 已記錄的結果（進入下一站後鎖定）
  const [finalizedResults, setFinalizedResults] = useState<(StationResult | null)[]>(
    () => stations.map(() => null),
  );
  const [examDone, setExamDone] = useState(false);
  // 是否在已完成站別中（唯讀瀏覽）
  const [viewOnly, setViewOnly] = useState(false);

  // ─── 計時器 ──────────────────────────────────────────────────
  // 共用計時：一個計時器貫穿全程
  // 分站計時：一個計時器，切站時 reset 並重新 start
  const isShared = timerMode === 'shared';
  const initDuration = isShared ? sharedDuration : stationDuration;

  const [pendingAutoStart, setPendingAutoStart] = useState(false);

  const handleTimeUp = useCallback(() => {
    // 時間到 → 強制鎖定當站，若為共用計時則直接結束測驗
    finalizeCurrentStation(true);
    if (isShared) {
      setExamDone(true);
    }
    // 分站計時：時間到自動進到下一站
    if (!isShared) {
      setCurrentIdx((prev) => {
        if (prev < stationCount - 1) {
          return prev + 1;
        }
        setExamDone(true);
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShared, stationCount]);

  const timer = useCountdown(initDuration, handleTimeUp);

  // 分站計時切站後自動啟動
  useEffect(() => {
    if (pendingAutoStart && timer.state === 'idle') {
      setPendingAutoStart(false);
      timer.start(stationDuration);
    }
  }, [pendingAutoStart, timer, stationDuration]);

  // ─── 共用計時：追蹤每站已用秒數 ─────────────────────────────
  // 切站時記錄當前 usedSeconds，便於計算每站用時
  const stationStartUsedRef = useRef(0); // 進入當前站時的 timer.usedSeconds

  // ─── 當前情境 ────────────────────────────────────────────────
  const currentScenario = useMemo(
    () => getScenario(stations[currentIdx].scenarioId),
    [stations, currentIdx],
  );

  const currentAnswers = allAnswers[currentIdx];
  const currentSummary = useScoreSummary(currentScenario!, currentAnswers);

  const isCurrentFinalized = finalizedResults[currentIdx] !== null;

  // ─── 鎖定當站結果 ────────────────────────────────────────────
  function finalizeCurrentStation(forced = false) {
    if (!currentScenario) return;
    if (finalizedResults[currentIdx] !== null) return; // 已鎖定

    const answers = allAnswers[currentIdx];
    const summary = computeScore(currentScenario, answers);
    const used = isShared
      ? timer.usedSeconds - stationStartUsedRef.current
      : timer.usedSeconds;

    const result: StationResult = {
      stationIndex: currentIdx,
      scenarioId: currentScenario.id,
      scenarioName: currentScenario.name,
      category: currentScenario.category,
      answers,
      summary,
      usedSeconds: used,
      completed: !forced,
    };

    setFinalizedResults((prev) => {
      const next = [...prev];
      next[currentIdx] = result;
      return next;
    });
  }

  // ─── 導覽：下一站 ────────────────────────────────────────────
  function goNext() {
    finalizeCurrentStation(false);
    const nextIdx = currentIdx + 1;

    if (!isShared) {
      timer.reset(stationDuration);
      setPendingAutoStart(true);
    } else {
      stationStartUsedRef.current = timer.usedSeconds;
    }

    if (nextIdx < stationCount) {
      setCurrentIdx(nextIdx);
      setViewOnly(false);
    } else {
      setExamDone(true);
    }
  }

  // ─── 導覽：上一站（唯讀） ────────────────────────────────────
  function goPrev() {
    if (currentIdx === 0) return;
    finalizeCurrentStation(false);
    setCurrentIdx(currentIdx - 1);
    setViewOnly(true);
  }

  // ─── 返回當前站 ──────────────────────────────────────────────
  function goToCurrent() {
    const lastActive = finalizedResults.reduce(
      (last, r, i) => (r !== null ? i : last),
      -1,
    );
    const target = lastActive + 1 < stationCount ? lastActive + 1 : lastActive;
    setCurrentIdx(target);
    setViewOnly(false);
  }

  // ─── 結束測驗 ────────────────────────────────────────────────
  function finishExam() {
    finalizeCurrentStation(false);
    setExamDone(true);
  }

  // ─── 測驗結束：呼叫 onComplete ────────────────────────────────
  useEffect(() => {
    if (!examDone) return;
    // 確保最後一站也有結果（可能 useEffect 比 setState 快）
    setFinalizedResults((prev) => {
      const updated = [...prev];
      if (updated[currentIdx] === null && currentScenario) {
        const answers = allAnswers[currentIdx];
        const summary = computeScore(currentScenario, answers);
        const used = isShared
          ? timer.usedSeconds - stationStartUsedRef.current
          : timer.usedSeconds;
        updated[currentIdx] = {
          stationIndex: currentIdx,
          scenarioId: currentScenario.id,
          scenarioName: currentScenario.name,
          category: currentScenario.category,
          answers,
          summary,
          usedSeconds: used,
          completed: true,
        };
      }
      // 補上空缺站（跳過的站）
      for (let i = 0; i < stationCount; i++) {
        if (updated[i] === null) {
          const sc = getScenario(stations[i].scenarioId);
          if (sc) {
            updated[i] = {
              stationIndex: i,
              scenarioId: sc.id,
              scenarioName: sc.name,
              category: sc.category,
              answers: allAnswers[i],
              summary: computeScore(sc, allAnswers[i]),
              usedSeconds: 0,
              completed: false,
            };
          }
        }
      }
      // 呼叫父元件
      setTimeout(
        () => onComplete(updated.filter(Boolean) as StationResult[]),
        0,
      );
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examDone]);

  // ─── 更新當站作答 ────────────────────────────────────────────
  function updateAnswers(next: AnswerMap) {
    if (viewOnly || isCurrentFinalized) return;
    setAllAnswers((prev) => {
      const copy = [...prev];
      copy[currentIdx] = next;
      return copy;
    });
  }

  if (!currentScenario) {
    return <div className="exam-runner__error">情境不存在，請返回重新設定。</div>;
  }

  const isLastStation = currentIdx === stationCount - 1;
  const isReadOnly = viewOnly || isCurrentFinalized;

  // 共用計時剩餘時間格式
  const timerDisplay = (
    <span
      className={`exam-timer ${
        timer.state === 'running' && timer.secondsLeft <= 60 ? 'exam-timer--warn' : ''
      } ${timer.state === 'finished' ? 'exam-timer--done' : ''}`}
    >
      {formatTime(timer.secondsLeft)}
    </span>
  );

  return (
    <div className="exam-runner">
      {/* ===== 頂部資訊列 ===== */}
      <div className="exam-header">
        <div className="exam-header__info">
          <span className="exam-header__mode">{EXAM_MODE_LABELS[config.mode]}</span>
          <span className="exam-header__divider">|</span>
          <span className="exam-header__station">
            第 {currentIdx + 1} 站 / 共 {stationCount} 站
          </span>
          <span className="exam-header__divider">|</span>
          <span className="exam-header__cat">{currentScenario.category}</span>
          <span className="exam-header__name">{currentScenario.name}</span>
        </div>

        <div className="exam-header__timer">
          <span className="exam-header__timer-label">
            {TIMER_MODE_LABELS[timerMode].split('（')[0]}
          </span>
          {timerDisplay}
          {timer.state === 'idle' && !viewOnly && !isCurrentFinalized && (
            <button
              className="btn btn--start"
              onClick={() =>
                isShared ? timer.start(sharedDuration) : timer.start(stationDuration)
              }
            >
              開始計時
            </button>
          )}
          {timer.state === 'running' && (
            <button className="btn btn--mini btn--ghost" onClick={timer.pause}>
              暫停
            </button>
          )}
          {timer.state === 'paused' && (
            <button className="btn btn--mini" onClick={timer.resume}>
              繼續
            </button>
          )}
        </div>

        <div className="exam-header__nav">
          <button
            className="btn btn--mini btn--ghost"
            onClick={goPrev}
            disabled={currentIdx === 0}
          >
            ◀ 上一站
          </button>
          {viewOnly ? (
            <button className="btn btn--mini" onClick={goToCurrent}>
              返回作答
            </button>
          ) : isLastStation ? (
            <button className="btn btn--mini btn--danger" onClick={finishExam}>
              結束測驗
            </button>
          ) : (
            <button className="btn btn--mini btn--next" onClick={goNext}>
              下一站 ▶
            </button>
          )}
          <button
            className="btn btn--mini btn--ghost exam-header__abort"
            onClick={() => {
              if (confirm('確定要放棄此次測驗？成績將不會儲存。')) onAbort();
            }}
          >
            放棄
          </button>
        </div>
      </div>

      {/* ===== 當站狀態提示 ===== */}
      {isReadOnly && (
        <div className="exam-station-notice exam-station-notice--locked">
          {isCurrentFinalized
            ? `第 ${currentIdx + 1} 站已鎖定（唯讀）`
            : '唯讀瀏覽'}
        </div>
      )}

      {/* ===== 即時統計列 ===== */}
      <div className="exam-scorebar">
        <span>
          完成率{' '}
          <strong>{(currentSummary.completionRate * 100).toFixed(0)}%</strong>
        </span>
        <span>
          重大缺失{' '}
          <strong
            className={currentSummary.criticalMissCount > 0 ? 'text--warn' : ''}
          >
            {currentSummary.criticalMissCount}
          </strong>
        </span>
        <span>
          分級{' '}
          <strong
            className={`grade-badge grade-badge--${currentSummary.grade}`}
          >
            {currentSummary.grade}
          </strong>
        </span>
        <span>
          {currentSummary.passed ? (
            <span className="pass-badge">通過</span>
          ) : (
            <span className="fail-badge">未通過</span>
          )}
        </span>
        {/* 站別快速跳轉 */}
        <div className="exam-station-tabs">
          {stations.map((_, i) => (
            <button
              key={i}
              className={`exam-station-tab ${i === currentIdx ? 'exam-station-tab--active' : ''} ${
                finalizedResults[i] !== null ? 'exam-station-tab--done' : ''
              }`}
              onClick={() => {
                if (i < currentIdx) {
                  finalizeCurrentStation(false);
                  setCurrentIdx(i);
                  setViewOnly(true);
                } else if (i > currentIdx) {
                  // 不允許跳過未作答的站
                } else {
                  setViewOnly(false);
                }
              }}
              title={`第 ${i + 1} 站${finalizedResults[i] !== null ? '（已完成）' : ''}`}
            >
              {i + 1}
              {finalizedResults[i] !== null && ' ✓'}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 評分卡片 ===== */}
      <ScoreCards
        scenario={currentScenario}
        answers={currentAnswers}
        onAnswersChange={updateAnswers}
        disabled={isReadOnly}
      />
    </div>
  );
}
