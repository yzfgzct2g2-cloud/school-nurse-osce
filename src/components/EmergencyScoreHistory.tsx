// ============================================================
// 校護緊急救護情境評分表 - 成績紀錄 v1.1.0
// ============================================================
import { useState } from 'react';
import type { ScoreRecord } from '../types/emergencyScoring';

export const APP_VERSION = 'v1.1.1';
export const APP_UPDATE = '2026-06-19';

const VERSION_HISTORY = [
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
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
  // 加上 BOM，Excel 開啟正體中文不亂碼
  return '﻿' + [CSV_HEADERS.join(','), ...rows].join('\r\n');
}

interface EmergencyScoreHistoryProps {
  records: ScoreRecord[];
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

export function EmergencyScoreHistory({
  records,
  onClearAll,
  onDelete,
}: EmergencyScoreHistoryProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const stamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const exportJson = () =>
    download(`校護評核紀錄_${stamp()}.json`, JSON.stringify(records, null, 2), 'application/json');

  const exportCsv = () =>
    download(`校護評核紀錄_${stamp()}.csv`, toCsv(records), 'text/csv;charset=utf-8');

  const handleClear = () => {
    if (records.length === 0) return;
    if (window.confirm('確定清除所有成績紀錄？此動作無法復原。')) onClearAll();
  };

  return (
    <div className="history">
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
            清除所有紀錄
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="history__empty">尚無紀錄。完成一次測驗後，成績會自動存在這裡。</p>
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

      {/* 版本歷程 */}
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
