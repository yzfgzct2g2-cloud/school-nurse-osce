// ============================================================
// 校護緊急救護情境評分表 - 主評分頁 v1.1.0
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  categories,
  getScenario,
  scenarios,
  scenariosByCategory,
} from '../data/emergencyScenarios';
import { computeScore, stepKey } from '../utils/emergencyScore';
import {
  DEFAULT_TEST_SECONDS,
  EmergencyTimer,
  TIMER_PRESETS,
  formatTime,
  useCountdown,
} from './EmergencyTimer';
import type {
  AnswerMap,
  Category,
  ScoreRecord,
  SectionGrade,
  StepStatus,
} from '../types/emergencyScoring';
import { STEP_STATUSES } from '../types/emergencyScoring';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const SECTION_GRADE_CLASS: Record<SectionGrade, string> = {
  標準: 'chip chip--standard',
  不標準: 'chip chip--sub',
  錯誤: 'chip chip--error',
};

const STATUS_CLASS: Record<StepStatus, string> = {
  標準: 'seg seg--standard',
  不標準: 'seg seg--sub',
  錯誤: 'seg seg--error',
  未操作: 'seg seg--none',
};

interface EmergencyScoreSheetProps {
  onSaveRecord: (record: ScoreRecord) => void;
}

export function EmergencyScoreSheet({ onSaveRecord }: EmergencyScoreSheetProps) {
  const firstScenario = scenariosByCategory('內科')[0];
  const [category, setCategory] = useState<Category>('內科');
  const [scenarioId, setScenarioId] = useState<string>(firstScenario.id);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentRecord, setCurrentRecord] = useState<ScoreRecord | null>(null);
  const [note, setNote] = useState('');

  // 自訂計時
  const [customDuration, setCustomDuration] = useState(DEFAULT_TEST_SECONDS);
  const customMinutes = Math.floor(customDuration / 60);
  const customSecs = customDuration % 60;

  // 隨機抽題
  const [randomFilter, setRandomFilter] = useState<'all' | Category>('all');
  const [autoStartOnRandom, setAutoStartOnRandom] = useState(false);
  const pendingStartRef = useRef(false);

  // 工具列自動收折（捲動偵測）
  const [topbarHidden, setTopbarHidden] = useState(false);
  const [scorebarCollapsed, setScorebarCollapsed] = useState(false);
  // 使用 ref 追蹤「當下狀態」，避免 debounce closure 讀到舊的 state
  const topbarHiddenRef = useRef(false);
  const scorebarCollapsedRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const THRESHOLD = 20;      // 至少位移 20px 才判定方向
    const DEBOUNCE_MS = 200;   // 防抖延遲

    const handleScroll = () => {
      const y = window.scrollY;

      // 到達頂部：強制展開
      const isAtTop = y <= 20;
      // 到達底部：不切換狀態，避免彈跳
      const isAtBottom =
        window.innerHeight + y >= document.body.offsetHeight - 10;

      if (isAtTop) {
        if (topbarHiddenRef.current) {
          topbarHiddenRef.current = false;
          setTopbarHidden(false);
        }
        if (scorebarCollapsedRef.current) {
          scorebarCollapsedRef.current = false;
          setScorebarCollapsed(false);
        }
        lastScrollYRef.current = y;
        return;
      }

      if (isAtBottom) {
        // 停在底部時不更新 lastScrollY，防止反向 delta 誤觸發
        return;
      }

      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      // 未超過閾值，不觸發
      if (Math.abs(delta) < THRESHOLD) return;

      // 清除前一個 debounce
      if (scrollDebounceRef.current !== null) {
        clearTimeout(scrollDebounceRef.current);
      }

      const newHidden = delta > 0; // 向下 → 收折；向上 → 展開

      scrollDebounceRef.current = setTimeout(() => {
        if (newHidden !== topbarHiddenRef.current) {
          topbarHiddenRef.current = newHidden;
          setTopbarHidden(newHidden);
        }
        if (newHidden !== scorebarCollapsedRef.current) {
          scorebarCollapsedRef.current = newHidden;
          setScorebarCollapsed(newHidden);
        }
      }, DEBOUNCE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollDebounceRef.current !== null) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, []);

  const finalizedRef = useRef(false);
  const secondsLeftRef = useRef(customDuration);

  const scenario = getScenario(scenarioId) ?? firstScenario;
  const summary = useMemo(
    () => computeScore(scenario, answers),
    [scenario, answers],
  );

  const handleTimeUp = useCallback(() => finalizeTest(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const timer = useCountdown(DEFAULT_TEST_SECONDS, handleTimeUp);
  secondsLeftRef.current = timer.secondsLeft;

  // -------- 重置輔助 --------
  const resetAttempt = useCallback(() => {
    setAnswers({});
    setCurrentRecord(null);
    setNote('');
    finalizedRef.current = false;
    timer.reset(customDuration);
  }, [timer, customDuration]);

  // 隨機抽題後的 pending start
  useEffect(() => {
    if (pendingStartRef.current && timer.state === 'idle') {
      pendingStartRef.current = false;
      timer.start(customDuration);
    }
  }, [timer.state, timer, customDuration]);

  // -------- 選單切換 --------
  function handleCategoryChange(next: Category) {
    setCategory(next);
    const first = scenariosByCategory(next)[0];
    setScenarioId(first.id);
    resetAttempt();
  }

  function handleScenarioChange(id: string) {
    setScenarioId(id);
    resetAttempt();
  }

  // -------- 隨機抽題 --------
  function pickRandom() {
    const pool =
      randomFilter === 'all' ? scenarios : scenariosByCategory(randomFilter);
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (!picked) return;
    setCategory(picked.category);
    setScenarioId(picked.id);
    // reset 後再 start
    setAnswers({});
    setCurrentRecord(null);
    setNote('');
    finalizedRef.current = false;
    timer.reset(customDuration);
    if (autoStartOnRandom) {
      pendingStartRef.current = true;
    }
  }

  // -------- 自訂計時輸入 --------
  function handleMinuteInput(val: string) {
    const m = Math.max(0, Math.min(99, parseInt(val) || 0));
    setCustomDuration(m * 60 + customSecs);
  }
  function handleSecondInput(val: string) {
    const s = Math.max(0, Math.min(59, parseInt(val) || 0));
    setCustomDuration(customMinutes * 60 + s);
  }

  // -------- 作答操作 --------
  function setStatus(sectionId: string, stepId: string, status: StepStatus) {
    setAnswers((prev) => ({ ...prev, [stepKey(sectionId, stepId)]: status }));
  }

  function toggleDone(sectionId: string, stepId: string) {
    const key = stepKey(sectionId, stepId);
    setAnswers((prev) => {
      const cur = prev[key] ?? '未操作';
      return { ...prev, [key]: cur === '標準' ? '未操作' : '標準' };
    });
  }

  function sectionAllStandard(sectionId: string) {
    const sec = scenario.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const step of sec.steps) next[stepKey(sectionId, step.id)] = '標準';
      return next;
    });
  }

  function clearSection(sectionId: string) {
    const sec = scenario.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const step of sec.steps) delete next[stepKey(sectionId, step.id)];
      return next;
    });
  }

  function clearAll() {
    setAnswers({});
  }

  // -------- 結束測驗 / 產生紀錄 --------
  function finalizeTest() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    timer.finish();

    const s = computeScore(scenario, answers);
    const used = timer.totalSeconds - secondsLeftRef.current;
    const record: ScoreRecord = {
      id: newId(),
      datetime: new Date().toISOString(),
      category,
      scenario: scenario.name,
      scenarioId: scenario.id,
      totalSteps: s.totalSteps,
      standardCount: s.standardCount,
      subStandardCount: s.subStandardCount,
      errorCount: s.errorCount,
      notDoneCount: s.notDoneCount,
      criticalMissCount: s.criticalMissCount,
      completionRate: s.completionRate,
      usedTimeSeconds: used,
      grade: s.grade,
      passed: s.passed,
      note: '',
    };
    setCurrentRecord(record);
    setNote('');
    onSaveRecord(record);
  }

  function handleNoteChange(value: string) {
    setNote(value);
    if (currentRecord) {
      const updated = { ...currentRecord, note: value };
      setCurrentRecord(updated);
      onSaveRecord(updated);
    }
  }

  const isFinished = timer.state === 'finished';
  const canStart = timer.state === 'idle';
  const running = timer.state === 'running';
  const paused = timer.state === 'paused';

  const scenarioList = scenariosByCategory(category);

  return (
    <div className="sheet">
      {/* ===== Mini 工具列（收折時顯示） ===== */}
      {topbarHidden && (
        <div className="topbar-mini">
          <EmergencyTimer
            secondsLeft={timer.secondsLeft}
            totalSeconds={timer.totalSeconds}
            state={timer.state}
            compact
          />
          <span className="topbar-mini__scenario">{scenario.name}</span>
          <button
            className="btn btn--mini"
            onClick={() => {
            topbarHiddenRef.current = false;
            scorebarCollapsedRef.current = false;
            setTopbarHidden(false);
            setScorebarCollapsed(false);
          }}
          >
            ▾ 展開工具列
          </button>
        </div>
      )}

      {/* ===== 固定頂部控制列 ===== */}
      <header className={`topbar ${topbarHidden ? 'topbar--hidden' : ''}`}>
        <div className="topbar__selects">
          <label className="field">
            <span className="field__label">類別</span>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">情境</span>
            <select
              value={scenarioId}
              onChange={(e) => handleScenarioChange(e.target.value)}
            >
              {scenarioList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>

        <EmergencyTimer
          secondsLeft={timer.secondsLeft}
          totalSeconds={timer.totalSeconds}
          state={timer.state}
        />

        <div className="topbar__buttons">
          <button
            className="btn btn--primary"
            onClick={() => timer.start(customDuration)}
            disabled={!canStart}
          >
            開始測驗
          </button>
          {paused ? (
            <button className="btn" onClick={timer.resume}>繼續</button>
          ) : (
            <button className="btn" onClick={timer.pause} disabled={!running}>暫停</button>
          )}
          <button
            className="btn btn--end"
            onClick={finalizeTest}
            disabled={!(running || paused)}
          >
            結束測驗
          </button>
          <button className="btn btn--ghost" onClick={clearAll}>全部清除</button>
          <button className="btn btn--ghost" onClick={resetAttempt}>重新開始</button>
        </div>

        {/* 計時設定（僅 idle 狀態顯示） */}
        {canStart && (
          <div className="timer-setup">
            <span className="timer-setup__label">計時設定</span>
            <div className="timer-setup__presets">
              {TIMER_PRESETS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  className={`btn btn--mini ${customDuration === seconds ? 'btn--preset-active' : ''}`}
                  onClick={() => { setCustomDuration(seconds); timer.reset(seconds); }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="timer-setup__custom">
              <input
                type="number"
                className="timer-setup__input"
                min={0}
                max={99}
                value={customMinutes}
                onChange={(e) => { handleMinuteInput(e.target.value); timer.reset(parseInt(e.target.value || '0') * 60 + customSecs); }}
                aria-label="分鐘"
              />
              <span className="timer-setup__sep">:</span>
              <input
                type="number"
                className="timer-setup__input"
                min={0}
                max={59}
                value={String(customSecs).padStart(2, '0')}
                onChange={(e) => { handleSecondInput(e.target.value); timer.reset(customMinutes * 60 + parseInt(e.target.value || '0')); }}
                aria-label="秒數"
              />
            </div>
          </div>
        )}

        {/* 隨機抽題 */}
        {canStart && (
          <div className="random-pick">
            <span className="timer-setup__label">隨機抽題</span>
            <select
              className="random-pick__filter"
              value={randomFilter}
              onChange={(e) => setRandomFilter(e.target.value as 'all' | Category)}
            >
              <option value="all">全部</option>
              <option value="內科">內科</option>
              <option value="外科">外科</option>
            </select>
            <button className="btn btn--mini btn--random" onClick={pickRandom}>
              🎲 隨機抽題
            </button>
            <label className="random-pick__auto">
              <input
                type="checkbox"
                checked={autoStartOnRandom}
                onChange={(e) => setAutoStartOnRandom(e.target.checked)}
              />
              <span>抽題後自動開始</span>
            </label>
          </div>
        )}
      </header>

      {/* ===== 結束後成績面板 ===== */}
      {isFinished && currentRecord && (
        <section
          className={`result ${currentRecord.passed ? 'result--pass' : 'result--fail'}`}
        >
          <div className="result__head">
            <div>
              <div className="result__grade">{currentRecord.grade}</div>
              <div className="result__verdict">
                {currentRecord.passed ? '通過' : '未通過'}
              </div>
            </div>
            <div className="result__metrics">
              <span>完成率 <b>{Math.round(currentRecord.completionRate * 100)}%</b></span>
              <span>用時 <b>{formatTime(currentRecord.usedTimeSeconds)}</b></span>
              <span>標準 <b>{currentRecord.standardCount}</b></span>
              <span>不標準 <b>{currentRecord.subStandardCount}</b></span>
              <span>錯誤 <b>{currentRecord.errorCount}</b></span>
              <span>未操作 <b>{currentRecord.notDoneCount}</b></span>
              <span className={currentRecord.criticalMissCount > 0 ? 'result__critical' : ''}>
                重大缺失 <b>{currentRecord.criticalMissCount}</b>
              </span>
            </div>
          </div>
          <label className="result__note">
            <span>備註</span>
            <textarea
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="可記錄需加強處、評核者意見等（自動存入紀錄）"
              rows={2}
            />
          </label>
          <div className="result__actions">
            <button className="btn btn--primary" onClick={resetAttempt}>
              重新開始同一情境
            </button>
          </div>
        </section>
      )}

      {/* ===== 評分表（各大項卡片） ===== */}
      <main className="cards">
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
                        onChange={() => toggleDone(sec.id, step.id)}
                        aria-label={`完成：${step.text}`}
                      />
                      <button
                        type="button"
                        className={`step__text ${done ? 'step__text--done' : ''}`}
                        onClick={() => toggleDone(sec.id, step.id)}
                      >
                        {step.text}
                      </button>
                      <div
                        className="step__status"
                        role="group"
                        aria-label="評核狀態"
                      >
                        {STEP_STATUSES.map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`${STATUS_CLASS[st]} ${status === st ? 'seg--active' : ''}`}
                            onClick={() => setStatus(sec.id, step.id, st)}
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
      </main>

      {/* ===== 固定底部即時計分 ===== */}
      <footer className={`scorebar ${scorebarCollapsed ? 'scorebar--collapsed' : ''}`}>
        {!scorebarCollapsed && (
          <>
            <span className="scorebar__item scorebar__item--standard">
              標準 <b>{summary.standardCount}</b>
            </span>
            <span className="scorebar__item scorebar__item--sub">
              不標準 <b>{summary.subStandardCount}</b>
            </span>
            <span className="scorebar__item scorebar__item--error">
              錯誤 <b>{summary.errorCount}</b>
            </span>
            <span className="scorebar__item scorebar__item--none">
              未操作 <b>{summary.notDoneCount}</b>
            </span>
            <span className={`scorebar__item ${summary.criticalMissCount > 0 ? 'scorebar__item--critical' : ''}`}>
              重大缺失 <b>{summary.criticalMissCount}</b>
            </span>
            <span className="scorebar__item">
              完成率 <b>{Math.round(summary.completionRate * 100)}%</b>
            </span>
          </>
        )}
        <span className="scorebar__item scorebar__grade">
          分級 <b>{summary.grade}</b>
        </span>
        <button
          className="scorebar__toggle"
          onClick={() => {
            const next = !scorebarCollapsedRef.current;
            scorebarCollapsedRef.current = next;
            setScorebarCollapsed(next);
          }}
          aria-label={scorebarCollapsed ? '展開統計列' : '收折統計列'}
        >
          {scorebarCollapsed ? '▴' : '▾'}
        </button>
      </footer>
    </div>
  );
}
