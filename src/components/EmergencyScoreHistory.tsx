// ============================================================
// 校護緊急救護情境評分表 - 成績紀錄 v1.2.0
// ============================================================
import { useState } from 'react';
import type { ScoreRecord } from '../types/emergencyScoring';
import type { ExamRecord } from '../types/examMode';
import { EXAM_MODE_LABELS, DUAL_SUB_LABELS } from '../types/examMode';

export const APP_VERSION = 'v1.2.0';
export const APP_UPDATE = '2026-06-20';

const VERSION_HISTORY = [
  {
    version: 'v1.2.0',
    date: '2026-06-20',
    changes: [
      '新增測驗模式：單題、雙題（A/B/C）、自選、正式測驗',
      '多站架構：支援 1–4 站，站別間可導覽（上一站 / 下一站）',
      '計時模式：共用計時（全程）與分站計時（每站獨立）',
      '即時統計列顯示完成率、重大缺失、分級',
      '站別快速跳轉 Tab，已完成站別唯讀保護',
      '測驗結果頁：各站明細 ＋ 綜合分級（加權平均）',
      '測驗紀錄獨立儲存於 localStorage，歷史頁新增測驗紀錄分頁',
      '評分卡片重構為共用元件（ScoreCards），減少重複',
      '版本升級至 v1.2.0',
    ],
  },
  {
    version: 'v1.1.1',
    date: '2026-06-19',
    changes: [
      '取消自動收折工具列，改為手動縮小／展開',
      '修正滑動到頁面底部時工具列反覆展開與收合問題',
      '工具列縮小狀態顯示情境名稱與計時器',
      '統計列展開顯示完整項目，縮小顯示關鍵資訊',
      '展開／縮小狀態儲存至 localStorage，重整後保留',
      '優化手機版評核空間',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-06-19',
    changes: [
      '自動收折工具列（捲動偵測）',
      '自訂倒數計時（預設 + 自訂分秒）',
      'CPR 獨立評分表',
      '異物梗塞獨立評分表',
      '隨機抽題（含自動開始選項）',
      '重大缺失（critical）判定機制',
      '分級規則更新（標準率 + 重大缺失）',
      '情境排序調整：輔助檢查→特殊處置→SAMPLE',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-06-01',
    changes: [
      '內科／外科切換',
      '情境切換（10 種）',
      '快速勾選、大項全選、清除',
      '四狀態分段按鈕',
      '12 分鐘倒數計時（警告音+震動）',
      '成績紀錄 + localStorage',
      'CSV／JSON 匯出',
      'GitHub Pages 部署',
    ],
  },
];

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function download(filename: string, content: string, mime: string) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch { /* 忽略下載失敗 */ }
}

const CSV_HEADERS = [
  '日期時間', '類別', '情境', '總步驟數', '標準數', '不標準數',
  '錯誤數', '未操作數', '重大缺失', '完成率', '使用時間', '分級', '是否通過', '備註',
];

function toCsv(records: ScoreRecord[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = records.map((r) =>
    [
      fmtDateTime(r.datetime),
      r.category,
      r.scenario,
      r.totalSteps,
      r.standardCount,
      r.subStandardCount,
      r.errorCount,
      r.notDoneCount,
      r.criticalMissCount ?? 0,
      `${Math.round(r.completionRate * 100)}%`,
      fmtClock(r.usedTimeSeconds),
      r.grade,
      r.passed ? '通過' : '未通過',
      r.note,
    ]
      .map(esc)
      .join(','),
  );
  return '﻿' + [CSV_HEADERS.join(','), ...rows].join('\r\n');
}

const EXAM_CSV_HEADERS = [
  '日期時間', '模式', '站數', '綜合分級', '是否通過', '綜合完成率', '重大缺失', '總計用時',
  '第1站情境', '第1站分級', '第1站完成率', '第1站用時',
  '第2站情境', '第2站分級', '第2站完成率', '第2站用時',
  '第3站情境', '第3站分級', '第3站完成率', '第3站用時',
  '第4站情境', '第4站分級', '第4站完成率', '第4站用時',
];

function toExamCsv(records: ExamRecord[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = records.map((r) => {
    const modeLabel =
      r.mode === 'dual' && r.dualSubMode
        ? `${EXAM_MODE_LABELS[r.mode]}-${r.dualSubMode}`
        : EXAM_MODE_LABELS[r.mode];
    const totalTime = r.stations.reduce((s, st) => s + st.usedSeconds, 0);
    const base = [
      fmtDateTime(r.datetime),
      modeLabel,
      r.stations.length,
      r.overallGrade,
      r.passed ? '通過' : '未通過',
      `${Math.round(r.overallCompletionRate * 100)}%`,
      r.totalCriticalMiss,
      fmtClock(totalTime),
    ];
    // 最多 4 站
    for (let i = 0; i < 4; i++) {
      const st = r.stations[i];
      if (st) {
        base.push(
          st.scenarioName,
          st.summary.grade,
          `${Math.round(st.summary.completionRate * 100)}%`,
          fmtClock(st.usedSeconds),
        );
      } else {
        base.push('', '', '', '');
      }
    }
    return base.map(esc).join(',');
  });
  return '﻿' + [EXAM_CSV_HEADERS.join(','), ...rows].join('\r\n');
}

interface EmergencyScoreHistoryProps {
  records: ScoreRecord[];
  examRecords: ExamRecord[];
  onClearAll: () => void;
  onDelete: (id: string) => void;
  onClearAllExam: () => void;
  onDeleteExam: (id: string) => void;
}

export function EmergencyScoreHistory({
  records,
  examRecords,
  onClearAll,
  onDelete,
  onClearAllExam,
  onDeleteExam,
}: EmergencyScoreHistoryProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'exam'>('single');
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const stamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  // ─── 單題紀錄 ─────────────────────────────────────────────────
  const exportJson    = () => download(`校護評核紀錄_${stamp()}.json`,     JSON.stringify(records, null, 2),   'application/json');
  const exportCsv     = () => download(`校護評核紀錄_${stamp()}.csv`,      toCsv(records),                     'text/csv;charset=utf-8');
  const handleClear   = () => {
    if (records.length === 0) return;
    if (window.confirm('確定清除所有單題成績紀錄？此動作無法復原。')) onClearAll();
  };

  // ─── 測驗紀錄 ─────────────────────────────────────────────────
  const exportExamJson  = () => download(`校護測驗紀錄_${stamp()}.json`,   JSON.stringify(examRecords, null, 2), 'application/json');
  const exportExamCsv   = () => download(`校護測驗紀錄_${stamp()}.csv`,    toExamCsv(examRecords),               'text/csv;charset=utf-8');
  const handleClearExam = () => {
    if (examRecords.length === 0) return;
    if (window.confirm('確定清除所有測驗紀錄？此動作無法復原。')) onClearAllExam();
  };

  return (
    <div className="history">
      {/* ─── 頁籤 ─── */}
      <div className="history__tabs">
        <button
          className={`history-tab ${activeTab === 'single' ? 'history-tab--active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          單題紀錄
          {records.length > 0 && (
            <span className="tab__count">{records.length}</span>
          )}
        </button>
        <button
          className={`history-tab ${activeTab === 'exam' ? 'history-tab--active' : ''}`}
          onClick={() => setActiveTab('exam')}
        >
          測驗紀錄
          {examRecords.length > 0 && (
            <span className="tab__count">{examRecords.length}</span>
          )}
        </button>
      </div>

      {/* ─── 單題紀錄 ─── */}
      {activeTab === 'single' && (
        <>
          <div className="history__bar">
            <span className="history__count">共 {records.length} 筆紀錄</span>
            <div className="history__actions">
              <button className="btn btn--mini" onClick={exportJson} disabled={records.length === 0}>
                匯出 JSON
              </button>
              <button className="btn btn--mini" onClick={exportCsv} disabled={records.length === 0}>
                匯出 CSV
              </button>
              <button className="btn btn--mini btn--ghost" onClick={handleClear} disabled={records.length === 0}>
                清除全部
              </button>
            </div>
          </div>
          {records.length === 0 ? (
            <p className="history__empty">尚無單題紀錄。在評分表完成一次測驗後，成績會自動存在這裡。</p>
          ) : (
            <div className="history__tablewrap">
              <table className="history__table">
                <thead>
                  <tr>
                    <th>日期時間</th>
                    <th>類別</th>
                    <th>情境</th>
                    <th>分級</th>
                    <th>通過</th>
                    <th>完成率</th>
                    <th>用時</th>
                    <th>標準</th>
                    <th>不標準</th>
                    <th>錯誤</th>
                    <th>未操作</th>
                    <th>重大缺失</th>
                    <th>總步驟</th>
                    <th>備註</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className={r.passed ? 'row--pass' : 'row--fail'}>
                      <td>{fmtDateTime(r.datetime)}</td>
                      <td>{r.category}</td>
                      <td>{r.scenario}</td>
                      <td><span className="grade-tag">{r.grade}</span></td>
                      <td>{r.passed ? '通過' : '未通過'}</td>
                      <td>{Math.round(r.completionRate * 100)}%</td>
                      <td>{fmtClock(r.usedTimeSeconds)}</td>
                      <td>{r.standardCount}</td>
                      <td>{r.subStandardCount}</td>
                      <td>{r.errorCount}</td>
                      <td>{r.notDoneCount}</td>
                      <td className={(r.criticalMissCount ?? 0) > 0 ? 'cell--critical' : ''}>
                        {r.criticalMissCount ?? 0}
                      </td>
                      <td>{r.totalSteps}</td>
                      <td className="history__note">{r.note}</td>
                      <td>
                        <button
                          className="btn btn--mini btn--ghost"
                          onClick={() => onDelete(r.id)}
                          aria-label="刪除此筆"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── 測驗紀錄 ─── */}
      {activeTab === 'exam' && (
        <>
          <div className="history__bar">
            <span className="history__count">共 {examRecords.length} 筆紀錄</span>
            <div className="history__actions">
              <button className="btn btn--mini" onClick={exportExamJson} disabled={examRecords.length === 0}>
                匯出 JSON
              </button>
              <button className="btn btn--mini" onClick={exportExamCsv} disabled={examRecords.length === 0}>
                匯出 CSV
              </button>
              <button className="btn btn--mini btn--ghost" onClick={handleClearExam} disabled={examRecords.length === 0}>
                清除全部
              </button>
            </div>
          </div>
          {examRecords.length === 0 ? (
            <p className="history__empty">尚無測驗紀錄。在測驗模式完成一次測驗後，成績會自動存在這裡。</p>
          ) : (
            <div className="history__exam-list">
              {examRecords.map((r) => {
                const modeLabel =
                  r.mode === 'dual' && r.dualSubMode
                    ? `${EXAM_MODE_LABELS[r.mode]} — ${DUAL_SUB_LABELS[r.dualSubMode]}`
                    : EXAM_MODE_LABELS[r.mode];
                const totalTime = r.stations.reduce((s, st) => s + st.usedSeconds, 0);
                return (
                  <div
                    key={r.id}
                    className={`exam-record ${r.passed ? 'exam-record--pass' : 'exam-record--fail'}`}
                  >
                    <div className="exam-record__head">
                      <span className="exam-record__datetime">{fmtDateTime(r.datetime)}</span>
                      <span className="exam-record__mode">{modeLabel}</span>
                      <span className="exam-record__grade">
                        <span className={`grade-tag grade-tag--${r.overallGrade}`}>{r.overallGrade}</span>
                        {r.passed ? (
                          <span className="pass-badge">通過</span>
                        ) : (
                          <span className="fail-badge">未通過</span>
                        )}
                      </span>
                      <button
                        className="btn btn--mini btn--ghost exam-record__del"
                        onClick={() => onDeleteExam(r.id)}
                      >
                        刪除
                      </button>
                    </div>
                    <div className="exam-record__summary">
                      <span>綜合完成率：<strong>{(r.overallCompletionRate * 100).toFixed(0)}%</strong></span>
                      <span>重大缺失：<strong className={r.totalCriticalMiss > 0 ? 'text--warn' : ''}>{r.totalCriticalMiss}</strong></span>
                      <span>總用時：<strong>{fmtClock(totalTime)}</strong></span>
                      <span>站數：<strong>{r.stations.length}</strong></span>
                    </div>
                    <div className="exam-record__stations">
                      {r.stations.map((st, idx) => (
                        <div key={idx} className="exam-station-chip">
                          <span className="exam-station-chip__num">第{idx + 1}站</span>
                          <span className="exam-station-chip__name">{st.scenarioName}</span>
                          <span className={`grade-tag grade-tag--${st.summary.grade}`}>
                            {st.summary.grade}
                          </span>
                          <span>{(st.summary.completionRate * 100).toFixed(0)}%</span>
                          <span>{fmtClock(st.usedSeconds)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── 版本歷程 ─── */}
      <div className="version-history">
        <button
          className="version-history__toggle"
          onClick={() => setShowVersionHistory((v) => !v)}
        >
          {showVersionHistory ? '▴' : '▾'} 版本歷程
        </button>
        {showVersionHistory && (
          <div className="version-history__body">
            {VERSION_HISTORY.map((v) => (
              <div key={v.version} className="version-history__entry">
                <div className="version-history__header">
                  <span className="version-history__tag">{v.version}</span>
                  <span className="version-history__date">{v.date}</span>
                </div>
                <ul className="version-history__list">
                  {v.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
