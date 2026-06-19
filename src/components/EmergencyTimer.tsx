// ============================================================
// 校護緊急救護情境評分表 - 計時器 v1.1.0
// 匯出：useCountdown（倒數邏輯 hook）、EmergencyTimer（顯示元件）
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerState } from '../types/emergencyScoring';

/** 預設測驗時間（秒）= 12 分鐘 */
export const DEFAULT_TEST_SECONDS = 12 * 60;
/** 最後幾秒進入警示狀態 */
export const WARNING_SECONDS = 60;

/** 計時預設選項 */
export const TIMER_PRESETS: { label: string; seconds: number }[] = [
  { label: '3分', seconds: 3 * 60 },
  { label: '5分', seconds: 5 * 60 },
  { label: '10分', seconds: 10 * 60 },
  { label: '12分', seconds: 12 * 60 },
  { label: '15分', seconds: 15 * 60 },
  { label: '30分', seconds: 30 * 60 },
];

// ------------------------------------------------------------
// 倒數邏輯 hook
// ------------------------------------------------------------
export interface CountdownApi {
  totalSeconds: number;
  secondsLeft: number;
  usedSeconds: number;
  state: TimerState;
  /** 開始計時（可帶入自訂秒數，不帶則沿用上次設定） */
  start: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  reset: (newTotal?: number) => void;
}

export function useCountdown(
  initialTotal: number = DEFAULT_TEST_SECONDS,
  onTimeUp?: () => void,
): CountdownApi {
  const [totalSeconds, setTotalSeconds] = useState(initialTotal);
  const [secondsLeft, setSecondsLeft] = useState(initialTotal);
  const [state, setState] = useState<TimerState>('idle');
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // 每秒遞減
  useEffect(() => {
    if (state !== 'running') return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // 時間歸零 → 自動結束
  useEffect(() => {
    if (secondsLeft === 0 && state === 'running') {
      setState('finished');
      onTimeUpRef.current?.();
    }
  }, [secondsLeft, state]);

  const start = useCallback((seconds?: number) => {
    const t = seconds !== undefined ? seconds : totalSeconds;
    setTotalSeconds(t);
    setSecondsLeft(t);
    setState('running');
  }, [totalSeconds]);

  const pause = useCallback(
    () => setState((s) => (s === 'running' ? 'paused' : s)),
    [],
  );

  const resume = useCallback(
    () => setState((s) => (s === 'paused' ? 'running' : s)),
    [],
  );

  const finish = useCallback(
    () => setState((s) => (s === 'finished' ? s : 'finished')),
    [],
  );

  const reset = useCallback(
    (newTotal?: number) => {
      const t = newTotal ?? totalSeconds;
      setTotalSeconds(t);
      setSecondsLeft(t);
      setState('idle');
    },
    [totalSeconds],
  );

  return {
    totalSeconds,
    secondsLeft,
    usedSeconds: totalSeconds - secondsLeft,
    state,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}

// ------------------------------------------------------------
// 提示音 / 震動（包 try/catch，任何失敗都不影響程式）
// ------------------------------------------------------------
function beep(freq = 880, durationMs = 250): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      try {
        osc.stop();
        void ctx.close();
      } catch { /* 忽略 */ }
    }, durationMs);
  } catch { /* 忽略：部分瀏覽器或未經使用者互動時不支援 */ }
}

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch { /* 忽略：桌機或不支援的瀏覽器 */ }
}

// ------------------------------------------------------------
// 顯示元件
// ------------------------------------------------------------
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface EmergencyTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  state: TimerState;
  compact?: boolean;
}

export function EmergencyTimer({ secondsLeft, state, compact = false }: EmergencyTimerProps) {
  const inWarning =
    secondsLeft <= WARNING_SECONDS &&
    secondsLeft > 0 &&
    (state === 'running' || state === 'paused');

  // 進入最後一分鐘：提示音 + 震動（只觸發一次）
  const warnedRef = useRef(false);
  useEffect(() => {
    if (secondsLeft > WARNING_SECONDS) {
      warnedRef.current = false;
      return;
    }
    if (inWarning && state === 'running' && !warnedRef.current) {
      warnedRef.current = true;
      beep(990, 300);
      vibrate([200, 100, 200]);
    }
  }, [inWarning, secondsLeft, state]);

  // 結束：提示音 + 震動（只觸發一次）
  const finishedRef = useRef(false);
  useEffect(() => {
    if (state === 'finished' && !finishedRef.current) {
      finishedRef.current = true;
      beep(520, 450);
      vibrate([300, 150, 300]);
    }
    if (state === 'idle') finishedRef.current = false;
  }, [state]);

  const stateLabel: Record<TimerState, string> = {
    idle: '待開始',
    running: '進行中',
    paused: '已暫停',
    finished: '已結束',
  };

  const cls = [
    'timer',
    compact ? 'timer--compact' : '',
    inWarning ? 'timer--warning' : '',
    state === 'finished' ? 'timer--finished' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} role="timer" aria-live="polite">
      <span className="timer__time">{formatTime(secondsLeft)}</span>
      {!compact && (
        <span className="timer__state">
          {inWarning ? '最後 1 分鐘！' : stateLabel[state]}
        </span>
      )}
    </div>
  );
}
