// ============================================================
// 校護緊急救護情境評分表 - App 根元件 v1.1.0
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { EmergencyScoreSheet } from './components/EmergencyScoreSheet';
import { EmergencyScoreHistory, APP_VERSION, APP_UPDATE } from './components/EmergencyScoreHistory';
import type { ScoreRecord } from './types/emergencyScoring';
import './App.css';

const STORAGE_KEY = 'school-nurse-osce-records-v1';

function loadRecords(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreRecord[]) : [];
  } catch {
    return [];
  }
}

type View = 'sheet' | 'history';

export default function App() {
  const [view, setView] = useState<View>('sheet');
  const [records, setRecords] = useState<ScoreRecord[]>(() => loadRecords());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch { /* 忽略寫入失敗（如隱私模式） */ }
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

  const clearAll = useCallback(() => setRecords([]), []);
  const deleteRecord = useCallback(
    (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id)),
    [],
  );

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
            onClick={() => setView('sheet')}
          >
            評分表
          </button>
          <button
            className={`tab ${view === 'history' ? 'tab--active' : ''}`}
            onClick={() => setView('history')}
          >
            成績紀錄
            {records.length > 0 && (
              <span className="tab__count">{records.length}</span>
            )}
          </button>
        </div>
        <div className="appnav__version">
          <span>{APP_VERSION}</span>
          <span className="appnav__update">Last Update {APP_UPDATE}</span>
        </div>
      </nav>

      {view === 'sheet' ? (
        <EmergencyScoreSheet onSaveRecord={saveRecord} />
      ) : (
        <EmergencyScoreHistory
          records={records}
          onClearAll={clearAll}
          onDelete={deleteRecord}
        />
      )}
    </div>
  );
}
