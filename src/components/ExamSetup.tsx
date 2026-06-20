// ============================================================
// 校護緊急救護情境評分表 - 測驗設定頁 v1.2.0
// ============================================================
import { useState } from 'react';
import { scenarios, scenariosByCategory, getScenario } from '../data/emergencyScenarios';
import {
  DEFAULT_EXAM_CONFIG,
  DUAL_SUB_LABELS,
  EXAM_MODE_LABELS,
  TIMER_MODE_LABELS,
  type DualSubMode,
  type ExamConfig,
  type ExamMode,
  type StationSetup,
  type TimerMode,
} from '../types/examMode';
import { TIMER_PRESETS } from './EmergencyTimer';

interface ExamSetupProps {
  onStart: (config: ExamConfig) => void;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStations(
  mode: ExamMode,
  dualSubMode: DualSubMode,
  customStations: StationSetup[],
): StationSetup[] {
  if (mode === 'single') {
    return customStations.length > 0
      ? [customStations[0]]
      : [{ scenarioId: scenariosByCategory('內科')[0].id }];
  }
  if (mode === 'formal' || (mode === 'dual' && dualSubMode === 'medSurg')) {
    const med = pickRandom(scenariosByCategory('內科'));
    const surg = pickRandom(scenariosByCategory('外科'));
    return [{ scenarioId: med.id }, { scenarioId: surg.id }];
  }
  if (mode === 'dual' && dualSubMode === 'random') {
    const pool = [...scenarios];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool[Math.floor(Math.random() * pool.length)];
    return [{ scenarioId: a.id }, { scenarioId: b.id }];
  }
  if (mode === 'dual' && dualSubMode === 'userPick') {
    return customStations.slice(0, 2);
  }
  // custom mode
  return customStations;
}

export function ExamSetup({ onStart }: ExamSetupProps) {
  const [mode, setMode] = useState<ExamMode>(DEFAULT_EXAM_CONFIG.mode);
  const [dualSubMode, setDualSubMode] = useState<DualSubMode>(DEFAULT_EXAM_CONFIG.dualSubMode);
  const [timerMode, setTimerMode] = useState<TimerMode>(DEFAULT_EXAM_CONFIG.timerMode);
  const [sharedMin, setSharedMin] = useState(Math.floor(DEFAULT_EXAM_CONFIG.sharedDuration / 60));
  const [stationMin, setStationMin] = useState(Math.floor(DEFAULT_EXAM_CONFIG.stationDuration / 60));

  // 自選模式的站別清單
  const [customStations, setCustomStations] = useState<StationSetup[]>([
    { scenarioId: scenariosByCategory('內科')[0].id },
  ]);

  // 預覽（自動模式才用）
  const [preview, setPreview] = useState<StationSetup[]>(() =>
    generateStations(DEFAULT_EXAM_CONFIG.mode, DEFAULT_EXAM_CONFIG.dualSubMode, []),
  );

  function refreshPreview() {
    setPreview(generateStations(mode, dualSubMode, customStations));
  }

  function addCustomStation() {
    if (customStations.length >= 4) return;
    setCustomStations((prev) => [...prev, { scenarioId: scenarios[0].id }]);
  }
  function removeCustomStation(idx: number) {
    setCustomStations((prev) => prev.filter((_, i) => i !== idx));
  }
  function setCustomScenario(idx: number, scenarioId: string) {
    setCustomStations((prev) => {
      const next = [...prev];
      next[idx] = { scenarioId };
      return next;
    });
  }

  const isAutoMode =
    mode === 'formal' ||
    mode === 'single' ||
    (mode === 'dual' && dualSubMode !== 'userPick');
  const isUserPickMode =
    mode === 'custom' || (mode === 'dual' && dualSubMode === 'userPick');

  function handleStart() {
    const stations = isUserPickMode
      ? customStations
      : mode === 'single'
      ? [{ scenarioId: customStations[0]?.scenarioId ?? scenariosByCategory('內科')[0].id }]
      : preview;

    if (stations.length === 0) {
      alert('請至少設定一個站別');
      return;
    }

    const config: ExamConfig = {
      mode,
      dualSubMode,
      timerMode,
      sharedDuration: sharedMin * 60,
      stationDuration: stationMin * 60,
      stations,
    };
    onStart(config);
  }

  const medScenarios = scenariosByCategory('內科');
  const surgScenarios = scenariosByCategory('外科');

  return (
    <div className="exam-setup">
      <div className="exam-setup__header">
        <h1 className="exam-setup__title">測驗模式設定</h1>
        <p className="exam-setup__sub">選擇測驗模式、計時方式後按【開始測驗】</p>
      </div>

      {/* ===== 測驗模式 ===== */}
      <section className="setup-card">
        <h2 className="setup-card__title">測驗模式</h2>
        <div className="setup-modes">
          {(Object.keys(EXAM_MODE_LABELS) as ExamMode[]).map((m) => (
            <label
              key={m}
              className={`setup-mode-btn ${mode === m ? 'setup-mode-btn--active' : ''}`}
            >
              <input
                type="radio"
                name="examMode"
                value={m}
                checked={mode === m}
                onChange={() => {
                  setMode(m);
                  if (m !== 'dual') {
                    setPreview(generateStations(m, dualSubMode, customStations));
                  }
                }}
              />
              {EXAM_MODE_LABELS[m]}
            </label>
          ))}
        </div>

        {/* 雙題子模式 */}
        {mode === 'dual' && (
          <div className="setup-submode">
            <p className="setup-label">雙題抽選方式</p>
            <div className="setup-submode__options">
              {(Object.keys(DUAL_SUB_LABELS) as DualSubMode[]).map((sm) => (
                <label
                  key={sm}
                  className={`setup-submode-btn ${dualSubMode === sm ? 'setup-submode-btn--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="dualSubMode"
                    value={sm}
                    checked={dualSubMode === sm}
                    onChange={() => {
                      setDualSubMode(sm);
                      if (sm !== 'userPick') {
                        setPreview(generateStations('dual', sm, customStations));
                      }
                    }}
                  />
                  {DUAL_SUB_LABELS[sm]}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== 站別設定 ===== */}
      {mode === 'single' && (
        <section className="setup-card">
          <h2 className="setup-card__title">選擇情境</h2>
          <div className="setup-station-row">
            <span className="setup-label">類別 / 情境</span>
            <select
              value={customStations[0]?.scenarioId ?? medScenarios[0].id}
              onChange={(e) =>
                setCustomStations([{ scenarioId: e.target.value }])
              }
              className="setup-select"
            >
              <optgroup label="內科">
                {medScenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="外科">
                {surgScenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </section>
      )}

      {isUserPickMode && (
        <section className="setup-card">
          <h2 className="setup-card__title">
            自選站別
            <span className="setup-card__hint">（最多 4 站）</span>
          </h2>
          {customStations.map((st, idx) => (
            <div key={idx} className="setup-station-row">
              <span className="setup-label">第 {idx + 1} 站</span>
              <select
                value={st.scenarioId}
                onChange={(e) => setCustomScenario(idx, e.target.value)}
                className="setup-select"
              >
                <optgroup label="內科">
                  {medScenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="外科">
                  {surgScenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                className="btn btn--mini btn--ghost"
                onClick={() => removeCustomStation(idx)}
                disabled={customStations.length <= 1}
              >
                移除
              </button>
            </div>
          ))}
          {customStations.length < 4 && (
            <button className="btn btn--mini" onClick={addCustomStation}>
              ＋ 新增站別
            </button>
          )}
        </section>
      )}

      {isAutoMode && mode !== 'single' && (
        <section className="setup-card">
          <h2 className="setup-card__title">
            站別預覽
            <button
              className="btn btn--mini btn--ghost setup-card__refresh"
              onClick={refreshPreview}
            >
              重新抽題
            </button>
          </h2>
          <div className="setup-preview">
            {preview.map((st, idx) => {
              const sc = getScenario(st.scenarioId);
              return (
                <div key={idx} className="setup-preview__item">
                  <span className="setup-preview__label">第 {idx + 1} 站</span>
                  <span className="setup-preview__cat">{sc?.category}</span>
                  <span className="setup-preview__name">{sc?.name ?? st.scenarioId}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== 計時設定 ===== */}
      <section className="setup-card">
        <h2 className="setup-card__title">計時模式</h2>
        <div className="setup-timer-modes">
          {(Object.keys(TIMER_MODE_LABELS) as TimerMode[]).map((tm) => (
            <label
              key={tm}
              className={`setup-submode-btn ${timerMode === tm ? 'setup-submode-btn--active' : ''}`}
            >
              <input
                type="radio"
                name="timerMode"
                value={tm}
                checked={timerMode === tm}
                onChange={() => setTimerMode(tm)}
              />
              {TIMER_MODE_LABELS[tm]}
            </label>
          ))}
        </div>

        {timerMode === 'shared' && (
          <div className="setup-duration">
            <span className="setup-label">總時間</span>
            <div className="setup-duration__presets">
              {TIMER_PRESETS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  className={`btn btn--mini ${sharedMin === seconds / 60 ? 'btn--preset-active' : ''}`}
                  onClick={() => setSharedMin(seconds / 60)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="setup-duration__custom">
              <input
                type="number"
                className="timer-setup__input"
                min={1} max={120}
                value={sharedMin}
                onChange={(e) => setSharedMin(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="setup-label">分鐘</span>
            </div>
          </div>
        )}

        {timerMode === 'station' && (
          <div className="setup-duration">
            <span className="setup-label">每站時間</span>
            <div className="setup-duration__presets">
              {TIMER_PRESETS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  className={`btn btn--mini ${stationMin === seconds / 60 ? 'btn--preset-active' : ''}`}
                  onClick={() => setStationMin(seconds / 60)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="setup-duration__custom">
              <input
                type="number"
                className="timer-setup__input"
                min={1} max={60}
                value={stationMin}
                onChange={(e) => setStationMin(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="setup-label">分鐘／站</span>
            </div>
          </div>
        )}
      </section>

      {/* ===== 開始按鈕 ===== */}
      <div className="exam-setup__actions">
        <button className="btn btn--primary exam-setup__start" onClick={handleStart}>
          開始測驗
        </button>
      </div>
    </div>
  );
}
