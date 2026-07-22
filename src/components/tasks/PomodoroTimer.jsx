import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelPomodoroSession,
  completePomodoroSession,
  getActivePomodoroSession,
  startPomodoroSession,
} from "../../api/tasksApi";
import {
  DEFAULT_POMODORO_SETTINGS,
  formatFocusDuration,
  formatTimer,
  readPomodoroSettings,
  writePomodoroSettings,
} from "../../utils/taskUtils";

function PomodoroTimer({
  task = null,
  tasks = [],
  compact = false,
  onSessionComplete,
  onTaskChange,
}) {
  const [settings, setSettings] = useState(readPomodoroSettings);
  const [session, setSession] = useState(null);
  const [sessionType, setSessionType] = useState("work");
  const [selectedTaskId, setSelectedTaskId] = useState(task?.id ? String(task.id) : "");
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const intervalRef = useRef(null);
  const completingRef = useRef(false);

  const durationSeconds = useMemo(() => {
    if (sessionType === "long_break") return settings.longBreakMinutes * 60;
    if (sessionType === "break") return settings.shortBreakMinutes * 60;
    return settings.workMinutes * 60;
  }, [sessionType, settings]);

  const activeTask = useMemo(() => {
    if (task) return task;
    return tasks.find((item) => String(item.id) === selectedTaskId) ?? null;
  }, [selectedTaskId, task, tasks]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(
    (type = sessionType) => {
      clearTimer();
      setRunning(false);
      setSessionType(type);
      const nextDuration =
        type === "long_break"
          ? settings.longBreakMinutes * 60
          : type === "break"
            ? settings.shortBreakMinutes * 60
            : settings.workMinutes * 60;
      setSecondsLeft(nextDuration);
    },
    [clearTimer, sessionType, settings]
  );

  useEffect(() => {
    let active = true;

    getActivePomodoroSession()
      .then((result) => {
        if (!active || !result.session) return;
        setSession(result.session);
        setSessionType(result.session.session_type === "break" ? "break" : "work");
        if (result.session.task_id) {
          setSelectedTaskId(String(result.session.task_id));
        }
        const startedMs = Date.parse(result.session.started_at);
        const elapsed = Number.isFinite(startedMs)
          ? Math.floor((Date.now() - startedMs) / 1000)
          : 0;
        const total =
          result.session.session_type === "break"
            ? settings.shortBreakMinutes * 60
            : settings.workMinutes * 60;
        setSecondsLeft(Math.max(0, total - elapsed));
        setRunning(true);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [settings.shortBreakMinutes, settings.workMinutes]);

  useEffect(() => {
    if (!running) {
      clearTimer();
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return clearTimer;
  }, [running, clearTimer]);

  useEffect(() => {
    if (!running || secondsLeft > 0 || completingRef.current) return;

    const finishSession = async () => {
      completingRef.current = true;
      clearTimer();
      setRunning(false);
      setStatus("Session complete.");

      try {
        if (session?.id) {
          await completePomodoroSession(session.id, { duration_seconds: durationSeconds });
        }

        if (sessionType === "work") {
          const nextCount = completedSessions + 1;
          setCompletedSessions(nextCount);
          onSessionComplete?.({ sessionType, task: activeTask, completedSessions: nextCount });
          if (nextCount % settings.sessionsBeforeLongBreak === 0) {
            resetTimer("long_break");
            setStatus("Great work. Take a long break.");
          } else {
            resetTimer("break");
            setStatus("Nice focus block. Take a short break.");
          }
        } else {
          resetTimer("work");
          setStatus("Break finished. Ready for another focus session.");
        }
        setSession(null);
      } catch (completeError) {
        setError(completeError.message);
      } finally {
        completingRef.current = false;
      }
    };

    finishSession();
  }, [
    activeTask,
    clearTimer,
    completedSessions,
    durationSeconds,
    onSessionComplete,
    resetTimer,
    running,
    secondsLeft,
    session,
    sessionType,
    settings.sessionsBeforeLongBreak,
  ]);

  const handleStart = async () => {
    setError("");
    setStatus("");

    try {
      const payload = {
        session_type: sessionType === "work" ? "work" : "break",
        task_id: sessionType === "work" && activeTask ? activeTask.id : null,
      };
      const result = await startPomodoroSession(payload);
      setSession(result.session);
      setRunning(true);
      setSecondsLeft(durationSeconds);
      setStatus(sessionType === "work" ? "Focus session started." : "Break started.");
    } catch (startError) {
      setError(startError.message);
    }
  };

  const handlePause = () => {
    setRunning(false);
    setStatus("Timer paused.");
  };

  const handleResume = () => {
    if (!session) {
      handleStart();
      return;
    }
    setRunning(true);
    setStatus("Timer resumed.");
  };

  const handleStop = async () => {
    clearTimer();
    setRunning(false);
    setStatus("Session stopped.");
    try {
      if (session?.id) {
        await cancelPomodoroSession(session.id);
      }
    } catch (stopError) {
      setError(stopError.message);
    } finally {
      setSession(null);
      resetTimer("work");
    }
  };

  const handleSettingsChange = (field, value) => {
    const next = { ...settings, [field]: Number(value) || DEFAULT_POMODORO_SETTINGS[field] };
    setSettings(next);
    writePomodoroSettings(next);
    if (!running) {
      resetTimer(sessionType);
    }
  };

  const progress = durationSeconds ? ((durationSeconds - secondsLeft) / durationSeconds) * 100 : 0;

  return (
    <section className={`pomodoro-panel${compact ? " pomodoro-panel-compact" : ""}`}>
      <div className="pomodoro-header">
        <div>
          <p className="pomodoro-kicker">Pomodoro Timer</p>
          <h2>{sessionType === "work" ? "Focus Session" : sessionType === "long_break" ? "Long Break" : "Short Break"}</h2>
        </div>
        <div className="pomodoro-session-count">{completedSessions} sessions today</div>
      </div>

      {!task && (
        <label className="pomodoro-task-select">
          <span>Linked task</span>
          <select
            value={selectedTaskId}
            onChange={(event) => {
              setSelectedTaskId(event.target.value);
              onTaskChange?.(event.target.value);
            }}
            disabled={running}
          >
            <option value="">No task selected</option>
            {tasks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {activeTask && (
        <p className="pomodoro-active-task">
          Working on: <strong>{activeTask.title}</strong>
          {activeTask.focus_seconds ? ` · ${formatFocusDuration(activeTask.focus_seconds)} logged` : ""}
        </p>
      )}

      <div className="pomodoro-ring" style={{ "--progress": `${progress}%` }}>
        <div className="pomodoro-time">{formatTimer(secondsLeft)}</div>
      </div>

      <div className="pomodoro-mode-tabs">
        {[
          ["work", "Focus"],
          ["break", "Break"],
          ["long_break", "Long Break"],
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            className={sessionType === type ? "active" : ""}
            onClick={() => resetTimer(type)}
            disabled={running}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pomodoro-actions">
        {!running ? (
          <button type="button" className="button-primary" onClick={session ? handleResume : handleStart}>
            {session ? "Resume" : "Start"}
          </button>
        ) : (
          <button type="button" onClick={handlePause}>
            Pause
          </button>
        )}
        <button type="button" className="danger-button" onClick={handleStop} disabled={!session && !running}>
          Stop
        </button>
      </div>

      {!compact && (
        <div className="pomodoro-settings">
          <label>
            Focus (min)
            <input
              type="number"
              min="1"
              max="120"
              value={settings.workMinutes}
              onChange={(event) => handleSettingsChange("workMinutes", event.target.value)}
            />
          </label>
          <label>
            Short break
            <input
              type="number"
              min="1"
              max="60"
              value={settings.shortBreakMinutes}
              onChange={(event) => handleSettingsChange("shortBreakMinutes", event.target.value)}
            />
          </label>
          <label>
            Long break
            <input
              type="number"
              min="1"
              max="60"
              value={settings.longBreakMinutes}
              onChange={(event) => handleSettingsChange("longBreakMinutes", event.target.value)}
            />
          </label>
        </div>
      )}

      {status && <p className="status-text">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export default PomodoroTimer;
