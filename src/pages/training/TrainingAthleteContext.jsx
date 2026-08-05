import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTrainingAthletes } from "../../api/trainingApi";

const TrainingAthleteContext = createContext(null);
const STORAGE_KEY = "training.athleteUserId";

function readStoredAthleteId(fallback) {
  try {
    return localStorage.getItem(STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function TrainingAthleteProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const selfId = user?.id ? String(user.id) : "";
  const [athletes, setAthletes] = useState([]);
  const [adminAthleteId, setAdminAthleteId] = useState(() =>
    isAdmin ? readStoredAthleteId(selfId) : selfId
  );

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    getTrainingAthletes()
      .then((result) => {
        if (active) setAthletes(result.athletes ?? []);
      })
      .catch(() => {
        if (active) setAthletes([]);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const setAthleteUserId = useCallback(
    (nextId) => {
      const value = String(nextId || selfId || "");
      setAdminAthleteId(value);
      if (isAdmin) {
        try {
          localStorage.setItem(STORAGE_KEY, value);
        } catch {
          /* ignore */
        }
      }
    },
    [isAdmin, selfId]
  );

  const athleteUserId = isAdmin ? adminAthleteId || selfId : selfId;

  const value = useMemo(
    () => ({
      athleteUserId,
      setAthleteUserId,
      athletes: isAdmin ? athletes : [],
      isAdmin,
    }),
    [athleteUserId, setAthleteUserId, athletes, isAdmin]
  );

  return (
    <TrainingAthleteContext.Provider value={value}>{children}</TrainingAthleteContext.Provider>
  );
}

export function useTrainingAthlete() {
  const ctx = useContext(TrainingAthleteContext);
  if (!ctx) {
    throw new Error("useTrainingAthlete must be used within TrainingAthleteProvider");
  }
  return ctx;
}

export function TrainingAthleteSwitcher() {
  const { isAdmin, athletes, athleteUserId, setAthleteUserId } = useTrainingAthlete();
  if (!isAdmin) return null;

  return (
    <label className="training-athlete-switcher">
      <span>Athlete</span>
      <select value={athleteUserId} onChange={(event) => setAthleteUserId(event.target.value)}>
        {athletes.length === 0 ? (
          <option value={athleteUserId}>Current user</option>
        ) : (
          athletes.map((athlete) => (
            <option key={athlete.id} value={String(athlete.id)}>
              {athlete.display_name || athlete.username}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
