// ============================================================
// 校護緊急救護情境評分表 - 主評分頁
// ============================================================
import { useMemo, useRef, useState } from 'react';
import {
  categories,
  getScenario,
  scenariosByCategory,
} from '../data/emergencyScenarios';
import { computeScore, stepKey } from '../utils/emergencyScore';
import {
  DEFAULT_TEST_SECONDS,
  EmergencyTimer,
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

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  const finalizedRef = useRef(false);
  const secondsLeftRef = useRef(DEFAULT_TEST_SECONDS);

  const scenario = getScenario(scenarioId) ?? firstScenario;
  const summary = useMemo(
    () => computeScore(scenario, answers),
    [scenario, answers],
  );

  const handleTimeUp = () => finalizeTest();
  const timer = useCountdown(DEFAULT_TEST_SECONDS, handleTimeUp);
  secondsLeftRef.current = timer.secondsLeft;

  // -------- 重置輔助 --------
  function resetAttempt() {
    setAnswers({});
    setCurrentRecord(null);
    setNote('');
    finalizedRef.current = false;
    timer.reset();
  }

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
    const used = DEFAULT_TEST_SECONDS - secondsLeftRef.current;
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
      onSaveRecord(updated); // 以相同 id upsert
    }
  }

  const isFinished = timer.state === 'finished';
  const canStart = timer.state === 'idle';
  const running = timer.state === 'running';
  const paused = timer.state === 'paused';

  const scenarioList = scenariosByCategory(category);

  return (
    <div className="sheet">
      {/* ===== 固定頂部控制列 ===== */}
      <header className="topbar">
        <div className="topbar__selects">
          <label className="field">
            <span className="field__label">類別</span>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
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
            onClick={timer.start}
            disabled={!canStart}
          >
            開始測驗
          </button>
          {paused ? (
            <button className="btn" onClick={timer.resume}>
              繼續
            </button>
          ) : (
            <button className="btn" onClick={timer.pause} disabled={!running}>
              暫停
            </button>
          )}
          <button
            className="btn btn--end"
            onClick={finalizeTest}
            disabled={!(running || paused)}
          >
            結束測驗
          </button>
          <button className="btn btn--ghost" onClick={clearAll}>
            全部清除
          </button>
          <button className="btn btn--ghost" onClick={resetAttempt}>
            重新開始
          </button>
        </div>
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
              <span>
                完成率 {Math.round(currentRecord.completionRate * 100)}%
              </span>
              <span>用時 {fmtClock(currentRecord.usedTimeSeconds)}</span>
              <span>標準 {currentRecord.standardCount}</span>
              <span>不標準 {currentRecord.subStandardCount}</span>
              <span>錯誤 {currentRecord.errorCount}</span>
              <span>未操作 {currentRecord.notDoneCount}</span>
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
        {scenario.sections.map((section) => {
          const secResult = summary.sections.find(
            (r) => r.sectionId === section.id,
          );
          return (
            <section
              key={section.id}
              className={`card ${section.special ? 'card--special' : ''}`}
            >
              <div className="card__head">
                <h2 className="card__title">
                  {section.title}
                  {section.special && (
                    <span className="badge">情境特殊</span>
                  )}
                </h2>
                {secResult && (
                  <span className={SECTION_GRADE_CLASS[secResult.grade]}>
                    {secResult.grade}
                  </span>
                )}
                <div className="card__actions">
                  <button
                    className="btn btn--mini"
                    onClick={() => sectionAllStandard(section.id)}
                  >
                    全選標準
                  </button>
                  <button
                    className="btn btn--mini btn--ghost"
                    onClick={() => clearSection(section.id)}
                  >
                    清除
                  </button>
                </div>
              </div>

              <ul className="steps">
                {section.steps.map((step) => {
                  const status: StepStatus =
                    answers[stepKey(section.id, step.id)] ?? '未操作';
                  const done = status === '標準';
                  return (
                    <li key={step.id} className="step">
                      <input
                        type="checkbox"
                        className="step__check"
                        checked={done}
                        onChange={() => toggleDone(section.id, step.id)}
                        aria-label={`完成：${step.text}`}
                      />
                      <button
                        type="button"
                        className={`step__text ${done ? 'step__text--done' : ''}`}
                        onClick={() => toggleDone(section.id, step.id)}
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
                            className={`${STATUS_CLASS[st]} ${
                              status === st ? 'seg--active' : ''
                            }`}
                            onClick={() => setStatus(section.id, step.id, st)}
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
      <footer className="scorebar">
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
        <span className="scorebar__item">
          完成率 <b>{Math.round(summary.completionRate * 100)}%</b>
        </span>
        <span className="scorebar__item scorebar__grade">
          初步分級 <b>{summary.grade}</b>
        </span>
      </footer>
    </div>
  );
}
