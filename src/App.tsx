// ============================================================
// 校護緊急救護情境評分表 - App 根元件 v1.2.0
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { EmergencyScoreSheet } from './components/EmergencyScoreSheet';
import { APP_UPDATE, APP_VERSION, EmergencyScoreHistory } from './components/EmergencyScoreHistory';
import { ExamResults } from './components/ExamResults';
import { ExamRunner } from './components/ExamRunner';
import { ExamSetup } from './components/ExamSetup';
import type { ScoreRecord } from './types/emergencyScoring';
import type { ExamConfig, ExamRecord, StationResult } from './types/examMode';
import './App.css';

const STORAGE_KEY      = 'school-nurse-osce-records-v1';
const EXAM_STORAGE_KEY = 'school-nurse-osce-exam-records-v1';

function loadJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

type View = 'sheet' | 'exam' | 'history';
type ExamPhase = 'setup' | 'running' | 'results';

export default function App() {
  const [view, setView] = useState<View>('sheet');

  // ─── 單題紀錄 ────────────────────────────────────────────────
  const [records, setRecords] = useState<ScoreRecord[]>(() => loadJson(STORAGE_KEY));
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { /* 忽略 */ }
  }, [records]);

  const saveRecord = useCallback((record: ScoreRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id);
      if (idx === -1) return [record, ...prev];
      const next = [...prev];
      next[idx] = record;
      return next;
    });
  }, []);
  const clearAll    = useCallback(() => setRecords([]), []);
  const deleteRecord = useCallback(
    (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id)),
    [],
  );

  // ─── 測驗紀錄 ────────────────────────────────────────────────
  const [examRecords, setExamRecords] = useState<ExamRecord[]>(() =>
    loadJson<ExamRecord>(EXAM_STORAGE_KEY),
  );
  useEffect(() => {
    try { localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(examRecords)); } catch { /* 忽略 */ }
  }, [examRecords]);

  const saveExamRecord = useCallback((record: ExamRecord) => {
    setExamRecords((prev) => [record, ...prev]);
  }, []);
  const clearExamAll    = useCallback(() => setExamRecords([]), []);
  const deleteExamRecord = useCallback(
    (id: string) => setExamRecords((prev) => prev.filter((r) => r.id !== id)),
    [],
  );

  // ─── 測驗模式流程 ────────────────────────────────────────────
  const [examPhase, setExamPhase] = useState<ExamPhase>('setup');
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examStationResults, setExamStationResults] = useState<StationResult[]>([]);

  function handleExamStart(config: ExamConfig) {
    setExamConfig(config);
    setExamPhase('running');
  }

  function handleExamComplete(results: StationResult[]) {
    setExamStationResults(results);
    setExamPhase('results');
  }

  function handleExamAbort() {
    setExamPhase('setup');
    setExamConfig(null);
  }

  function handleExamSave(record: ExamRecord) {
    saveExamRecord(record);
    setView('history');
    setExamPhase('setup');
  }

  function handleExamRetry() {
    setExamPhase('setup');
    setExamConfig(null);
  }

  function handleExamHome() {
    setExamPhase('setup');
    setExamConfig(null);
    setView('sheet');
  }

  // 切換 tab 時重置測驗流程
  function switchView(v: View) {
    if (v !== 'exam') {
      setExamPhase('setup');
      setExamConfig(null);
    }
    setView(v);
  }

  const totalCount = records.length + examRecords.length;

  return (
    <div className="app">
      <nav className="appnav">
        <div className="appnav__brand">
          <span className="appnav__mark" aria-hidden>＋</span>
          校護緊急救護情境評核
        </div>
        <div className="appnav__tabs">
          <button
            className={`tab ${view === 'sheet' ? 'tab--active' : ''}`}
            onClick={() => switchView('sheet')}
          >
            評分表
          </button>
          <button
            className={`tab ${view === 'exam' ? 'tab--active' : ''}`}
            onClick={() => switchView('exam')}
          >
            測驗模式
          </button>
          <button
            className={`tab ${view === 'history' ? 'tab--active' : ''}`}
            onClick={() => switchView('history')}
          >
            成績紀錄
            {totalCount > 0 && (
              <span className="tab__count">{totalCount}</span>
            )}
          </button>
        </div>
        <div className="appnav__version">
          <span>{APP_VERSION}</span>
          <span className="appnav__update">Last Update {APP_UPDATE}</span>
        </div>
      </nav>

      {view === 'sheet' && (
        <EmergencyScoreSheet onSaveRecord={saveRecord} />
      )}

      {view === 'exam' && (
        <>
          {examPhase === 'setup' && (
            <ExamSetup onStart={handleExamStart} />
          )}
          {examPhase === 'running' && examConfig && (
            <ExamRunner
              config={examConfig}
              onComplete={handleExamComplete}
              onAbort={handleExamAbort}
            />
          )}
          {examPhase === 'results' && examConfig && (
            <ExamResults
              config={examConfig}
              stationResults={examStationResults}
              onSave={handleExamSave}
              onRetry={handleExamRetry}
              onHome={handleExamHome}
            />
          )}
        </>
      )}

      {view === 'history' && (
        <EmergencyScoreHistory
          records={records}
          examRecords={examRecords}
          onClearAll={clearAll}
          onDelete={deleteRecord}
          onClearAllExam={clearExamAll}
          onDeleteExam={deleteExamRecord}
        />
      )}
    </div>
  );
}
