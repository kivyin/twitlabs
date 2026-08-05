/**
 * Training app schema + HTTP handlers (Strong/Hevy-style workout tracker).
 * Installed into vite.sqlite-api.js via installTrainingApi(deps).
 */

const SEED_EXERCISES = [
  // Chest
  ["Bench Press", "Chest", "Barbell"],
  ["Barbell Bench Press", "Chest", "Barbell"],
  ["Incline Bench Press", "Chest", "Barbell"],
  ["Decline Bench Press", "Chest", "Barbell"],
  ["Dumbbell Bench Press", "Chest", "Dumbbell"],
  ["Incline Dumbbell Press", "Chest", "Dumbbell"],
  ["Decline Dumbbell Press", "Chest", "Dumbbell"],
  ["Dumbbell Fly", "Chest", "Dumbbell"],
  ["Incline Dumbbell Fly", "Chest", "Dumbbell"],
  ["Cable Chest Fly", "Chest", "Cable"],
  ["Pec Deck", "Chest", "Machine"],
  ["Chest Press Machine", "Chest", "Machine"],
  ["Push-Up", "Chest", "Bodyweight"],
  ["Incline Push-Up", "Chest", "Bodyweight"],
  ["Decline Push-Up", "Chest", "Bodyweight"],
  ["Diamond Push-Up", "Chest", "Bodyweight"],
  ["Chest Dip", "Chest", "Bodyweight"],
  ["Cable Crossover", "Chest", "Cable"],
  ["Landmine Press", "Chest", "Barbell"],
  // Back
  ["Pull-Up", "Back", "Bodyweight"],
  ["Chin-Up", "Back", "Bodyweight"],
  ["Neutral-Grip Pull-Up", "Back", "Bodyweight"],
  ["Lat Pulldown", "Back", "Machine"],
  ["Wide-Grip Lat Pulldown", "Back", "Machine"],
  ["Close-Grip Lat Pulldown", "Back", "Machine"],
  ["Seated Cable Row", "Back", "Cable"],
  ["Chest-Supported Row", "Back", "Machine"],
  ["Barbell Row", "Back", "Barbell"],
  ["Pendlay Row", "Back", "Barbell"],
  ["Yates Row", "Back", "Barbell"],
  ["T-Bar Row", "Back", "Barbell"],
  ["Dumbbell Row", "Back", "Dumbbell"],
  ["Single-Arm Dumbbell Row", "Back", "Dumbbell"],
  ["Meadows Row", "Back", "Barbell"],
  ["Face Pull", "Shoulders", "Cable"],
  ["Straight-Arm Pulldown", "Back", "Cable"],
  ["Inverted Row", "Back", "Bodyweight"],
  ["Shrug", "Back", "Barbell"],
  ["Dumbbell Shrug", "Back", "Dumbbell"],
  ["Rack Pull", "Back", "Barbell"],
  ["Good Morning", "Posterior chain", "Barbell"],
  // Shoulders
  ["Overhead Press", "Shoulders", "Barbell"],
  ["Military Press", "Shoulders", "Barbell"],
  ["Push Press", "Shoulders", "Barbell"],
  ["Seated Overhead Press", "Shoulders", "Barbell"],
  ["Dumbbell Shoulder Press", "Shoulders", "Dumbbell"],
  ["Arnold Press", "Shoulders", "Dumbbell"],
  ["Dumbbell Lateral Raise", "Shoulders", "Dumbbell"],
  ["Cable Lateral Raise", "Shoulders", "Cable"],
  ["Front Raise", "Shoulders", "Dumbbell"],
  ["Rear Delt Fly", "Shoulders", "Dumbbell"],
  ["Reverse Pec Deck", "Shoulders", "Machine"],
  ["Upright Row", "Shoulders", "Barbell"],
  ["Machine Shoulder Press", "Shoulders", "Machine"],
  // Legs / glutes
  ["Squat", "Legs", "Barbell"],
  ["Barbell Back Squat", "Legs", "Barbell"],
  ["Front Squat", "Legs", "Barbell"],
  ["Safety Bar Squat", "Legs", "Barbell"],
  ["Box Squat", "Legs", "Barbell"],
  ["Goblet Squat", "Legs", "Dumbbell"],
  ["Hack Squat", "Legs", "Machine"],
  ["Leg Press", "Legs", "Machine"],
  ["Bulgarian Split Squat", "Legs", "Dumbbell"],
  ["Walking Lunge", "Legs", "Dumbbell"],
  ["Reverse Lunge", "Legs", "Dumbbell"],
  ["Step-Up", "Legs", "Dumbbell"],
  ["Leg Extension", "Legs", "Machine"],
  ["Leg Curl", "Legs", "Machine"],
  ["Seated Leg Curl", "Legs", "Machine"],
  ["Lying Leg Curl", "Legs", "Machine"],
  ["Romanian Deadlift", "Posterior chain", "Barbell"],
  ["Stiff-Leg Deadlift", "Posterior chain", "Barbell"],
  ["Conventional Deadlift", "Posterior chain", "Barbell"],
  ["Sumo Deadlift", "Posterior chain", "Barbell"],
  ["Trap Bar Deadlift", "Posterior chain", "Trap bar"],
  ["Hip Thrust", "Glutes", "Barbell"],
  ["Glute Bridge", "Glutes", "Bodyweight"],
  ["Cable Pull-Through", "Glutes", "Cable"],
  ["Calf Raise", "Calves", "Machine"],
  ["Seated Calf Raise", "Calves", "Machine"],
  ["Standing Calf Raise", "Calves", "Machine"],
  ["Donkey Calf Raise", "Calves", "Machine"],
  ["Adductor Machine", "Legs", "Machine"],
  ["Abductor Machine", "Glutes", "Machine"],
  // Arms
  ["Barbell Curl", "Arms", "Barbell"],
  ["Dumbbell Curl", "Arms", "Dumbbell"],
  ["Hammer Curl", "Arms", "Dumbbell"],
  ["Preacher Curl", "Arms", "Machine"],
  ["Incline Dumbbell Curl", "Arms", "Dumbbell"],
  ["Cable Curl", "Arms", "Cable"],
  ["Concentration Curl", "Arms", "Dumbbell"],
  ["Triceps Pushdown", "Arms", "Cable"],
  ["Rope Pushdown", "Arms", "Cable"],
  ["Overhead Triceps Extension", "Arms", "Dumbbell"],
  ["Skull Crusher", "Arms", "Barbell"],
  ["Close-Grip Bench Press", "Arms", "Barbell"],
  ["Triceps Dip", "Arms", "Bodyweight"],
  ["Kickback", "Arms", "Dumbbell"],
  ["Wrist Curl", "Arms", "Barbell"],
  ["Reverse Wrist Curl", "Arms", "Barbell"],
  // Core
  ["Plank", "Core", "Bodyweight"],
  ["Side Plank", "Core", "Bodyweight"],
  ["Crunch", "Core", "Bodyweight"],
  ["Sit-Up", "Core", "Bodyweight"],
  ["Cable Crunch", "Core", "Cable"],
  ["Hanging Leg Raise", "Core", "Bodyweight"],
  ["Hanging Knee Raise", "Core", "Bodyweight"],
  ["Ab Wheel Rollout", "Core", "Other"],
  ["Russian Twist", "Core", "Bodyweight"],
  ["Dead Bug", "Core", "Bodyweight"],
  ["Bird Dog", "Core", "Bodyweight"],
  ["Pallof Press", "Core", "Cable"],
  ["Mountain Climber", "Core", "Bodyweight"],
  // Olympic / power
  ["Power Clean", "Full body", "Barbell"],
  ["Hang Clean", "Full body", "Barbell"],
  ["Clean and Jerk", "Full body", "Barbell"],
  ["Snatch", "Full body", "Barbell"],
  ["Push Jerk", "Full body", "Barbell"],
  // Conditioning
  ["Kettlebell Swing", "Posterior chain", "Kettlebell"],
  ["Kettlebell Clean", "Full body", "Kettlebell"],
  ["Kettlebell Snatch", "Full body", "Kettlebell"],
  ["Turkish Get-Up", "Full body", "Kettlebell"],
  ["Farmer Carry", "Full body", "Dumbbell"],
  ["Suitcase Carry", "Full body", "Dumbbell"],
  ["Box Jump", "Legs", "Bodyweight"],
  ["Jump Rope", "Cardio", "Other"],
  ["Burpee", "Full body", "Bodyweight"],
  ["Battle Rope", "Cardio", "Other"],
  ["Sled Push", "Full body", "Other"],
  ["Sled Pull", "Full body", "Other"],
  ["Treadmill Run", "Cardio", "Machine"],
  ["Treadmill Walk", "Cardio", "Machine"],
  ["Rowing Machine", "Cardio", "Machine"],
  ["Assault Bike", "Cardio", "Machine"],
  ["Stationary Bike", "Cardio", "Machine"],
  ["Elliptical", "Cardio", "Machine"],
  ["Stair Climber", "Cardio", "Machine"],
  ["Swimming", "Cardio", "Other"],
  // Boxing / kickboxing / martial arts
  ["Shadow Boxing", "Cardio", "Bodyweight"],
  ["Heavy Bag Rounds", "Cardio", "Other"],
  ["Speed Bag", "Martial arts", "Other"],
  ["Double-End Bag", "Martial arts", "Other"],
  ["Focus Mitt Work", "Martial arts", "Other"],
  ["Jab-Cross Combinations", "Martial arts", "Bodyweight"],
  ["Jab-Cross-Hook Combinations", "Martial arts", "Bodyweight"],
  ["Uppercut Drill", "Martial arts", "Bodyweight"],
  ["Slip Drill", "Martial arts", "Bodyweight"],
  ["Bob and Weave", "Martial arts", "Bodyweight"],
  ["Defensive Pivot Drill", "Martial arts", "Bodyweight"],
  ["Footwork Ladder", "Martial arts", "Bodyweight"],
  ["Boxing Footwork Circles", "Martial arts", "Bodyweight"],
  ["Clinch Work", "Martial arts", "Bodyweight"],
  ["Pad Work Rounds", "Cardio", "Other"],
  ["Kickboxing Shadow Work", "Cardio", "Bodyweight"],
  ["Roundhouse Kick Drill", "Martial arts", "Bodyweight"],
  ["Front Kick Drill", "Martial arts", "Bodyweight"],
  ["Side Kick Drill", "Martial arts", "Bodyweight"],
  ["Teep Kick Drill", "Martial arts", "Bodyweight"],
  ["Knee Strike Drill", "Martial arts", "Bodyweight"],
  ["Elbow Strike Drill", "Martial arts", "Bodyweight"],
  ["Thai Pad Rounds", "Cardio", "Other"],
  ["Kick Shield Rounds", "Cardio", "Other"],
  ["Muay Thai Clinch Knees", "Martial arts", "Bodyweight"],
  ["Sprawls", "Martial arts", "Bodyweight"],
  ["Shoot Wrestling Drill", "Martial arts", "Bodyweight"],
  ["Hip Escape / Shrimp", "Martial arts", "Bodyweight"],
  ["Technical Stand-Up", "Martial arts", "Bodyweight"],
  ["Guard Retention Drill", "Martial arts", "Bodyweight"],
  ["BJJ Shrimping", "Martial arts", "Bodyweight"],
  ["Bridge and Roll Drill", "Martial arts", "Bodyweight"],
  ["Grappling Flow Drill", "Martial arts", "Bodyweight"],
  ["Kara-te Kata Practice", "Martial arts", "Bodyweight"],
  ["Martial Arts Forms Practice", "Martial arts", "Bodyweight"],
  ["Fight Stance Holds", "Martial arts", "Bodyweight"],
  ["Neck Bridging", "Martial arts", "Bodyweight"],
  ["Wrist Strength Circles", "Martial arts", "Bodyweight"],
  ["Knuckle Push-Up", "Martial arts", "Bodyweight"],
  ["Explosive Push-Up", "Martial arts", "Bodyweight"],
  ["Medicine Ball Slam", "Full body", "Other"],
  ["Medicine Ball Rotational Throw", "Core", "Other"],
  ["Tire Flip", "Full body", "Other"],
  ["Sledgehammer Tire Hits", "Full body", "Other"],
  // Mobility / martial arts stretching
  ["Stretching", "Mobility", "Bodyweight"],
  ["Foam Rolling", "Mobility", "Other"],
  ["Hip Flexor Stretch", "Mobility", "Bodyweight"],
  ["Hamstring Stretch", "Mobility", "Bodyweight"],
  ["Quad Stretch", "Mobility", "Bodyweight"],
  ["Pigeon Stretch", "Mobility", "Bodyweight"],
  ["Butterfly Stretch", "Mobility", "Bodyweight"],
  ["Seated Forward Fold", "Mobility", "Bodyweight"],
  ["World's Greatest Stretch", "Mobility", "Bodyweight"],
  ["Couch Stretch", "Mobility", "Bodyweight"],
  ["90/90 Hip Stretch", "Mobility", "Bodyweight"],
  ["Thoracic Rotation Stretch", "Mobility", "Bodyweight"],
  ["Shoulder Dislocates", "Mobility", "Other"],
  ["Cat-Cow", "Mobility", "Bodyweight"],
  ["Child's Pose", "Mobility", "Bodyweight"],
  ["Downward Dog", "Mobility", "Bodyweight"],
  ["Cobra Stretch", "Mobility", "Bodyweight"],
  ["Neck Mobility Circles", "Mobility", "Bodyweight"],
  ["Wrist Mobility Stretch", "Mobility", "Bodyweight"],
  ["Ankle Mobility Rocks", "Mobility", "Bodyweight"],
  ["Dynamic Leg Swings", "Mobility", "Bodyweight"],
  ["Arm Circles Warm-Up", "Mobility", "Bodyweight"],
  ["Martial Arts Hip Opener Flow", "Mobility", "Bodyweight"],
  ["Kickboxing Cool-Down Stretch", "Mobility", "Bodyweight"],
  ["Fighter Hip Mobility Flow", "Mobility", "Bodyweight"],
];

const TRAINING_AI_GOALS_PREF = "training_ai_goals";

export function installTrainingApi(deps) {
  const {
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    isSessionAdmin,
    userCanAccessApp,
    json,
    readBody,
    sendApiError,
    callGeminiJson,
    USERS_TABLE,
    USER_PREFERENCES_TABLE,
    TRAINING_EXERCISES_TABLE,
    TRAINING_ROUTINES_TABLE,
    TRAINING_ROUTINE_EXERCISES_TABLE,
    TRAINING_WORKOUTS_TABLE,
    TRAINING_WORKOUT_EXERCISES_TABLE,
    TRAINING_WORKOUT_SETS_TABLE,
    TRAINING_MEASUREMENTS_TABLE,
  } = deps;

  const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

  const ensureTrainingSchema = () => {
    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_EXERCISES_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        muscle_group TEXT,
        equipment TEXT,
        notes TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_ROUTINES_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_ROUTINE_EXERCISES_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        superset_group INTEGER,
        target_sets INTEGER,
        target_reps INTEGER,
        target_weight REAL,
        target_duration_mins REAL,
        target_distance REAL,
        notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_WORKOUTS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        routine_id INTEGER,
        name TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_WORKOUT_EXERCISES_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        superset_group INTEGER,
        notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_WORKOUT_SETS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL,
        set_index INTEGER NOT NULL DEFAULT 1,
        weight REAL,
        reps INTEGER,
        duration_mins REAL,
        distance REAL,
        rpe REAL,
        is_warmup INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_MEASUREMENTS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        measured_on TEXT NOT NULL,
        body_weight REAL,
        waist REAL,
        chest REAL,
        arms REAL,
        hips REAL,
        thighs REAL,
        notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(
      `CREATE INDEX IF NOT EXISTS idx_training_exercises_user ON ${TRAINING_EXERCISES_TABLE}(user_id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_training_routines_user ON ${TRAINING_ROUTINES_TABLE}(user_id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_training_workouts_user ON ${TRAINING_WORKOUTS_TABLE}(user_id, status)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_training_measurements_user ON ${TRAINING_MEASUREMENTS_TABLE}(user_id, measured_on)`
    );

    const ensureColumn = (table, column, definition) => {
      const cols = all(`PRAGMA table_info(${table})`).map((row) => row.name);
      if (!cols.includes(column)) {
        run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    };
    ensureColumn(TRAINING_WORKOUT_SETS_TABLE, "duration_mins", "REAL");
    ensureColumn(TRAINING_WORKOUT_SETS_TABLE, "distance", "REAL");
    ensureColumn(TRAINING_ROUTINE_EXERCISES_TABLE, "target_duration_mins", "REAL");
    ensureColumn(TRAINING_ROUTINE_EXERCISES_TABLE, "target_distance", "REAL");
    ensureColumn(TRAINING_ROUTINES_TABLE, "plan_week", "INTEGER");
    ensureColumn(TRAINING_ROUTINES_TABLE, "plan_day", "INTEGER");

    // Backfill AI plan week/day from names like "… · W2 · Mon · Push"
    const needsPlanOrder = all(
      `
        SELECT id, name FROM ${TRAINING_ROUTINES_TABLE}
        WHERE plan_week IS NULL
          AND name LIKE '% · W% · %'
      `
    );
    for (const row of needsPlanOrder) {
      const match = String(row.name || "").match(/·\s*W(\d+)\s*·\s*([^·]+)\s*·/i);
      if (!match) continue;
      const week = Number(match[1]);
      const dayLabel = String(match[2] || "").trim().toLowerCase();
      const dayMap = {
        mon: 1,
        monday: 1,
        tue: 2,
        tuesday: 2,
        wed: 3,
        wednesday: 3,
        thu: 4,
        thursday: 4,
        fri: 5,
        friday: 5,
        sat: 6,
        saturday: 6,
        sun: 7,
        sunday: 7,
      };
      let day = dayMap[dayLabel];
      if (!day) {
        const dayNum = dayLabel.match(/day\s*(\d+)/i);
        day = dayNum ? Number(dayNum[1]) : null;
      }
      if (!Number.isFinite(week)) continue;
      run(`UPDATE ${TRAINING_ROUTINES_TABLE} SET plan_week = ?, plan_day = ? WHERE id = ?`, [
        week,
        Number.isFinite(day) ? day : null,
        row.id,
      ]);
    }

    // Insert any missing system exercises (safe to re-run as library grows).
    const existingNames = new Set(
      all(
        `SELECT name FROM ${TRAINING_EXERCISES_TABLE} WHERE user_id IS NULL`
      ).map((row) => String(row.name).toLowerCase())
    );
    const ts = stamp();
    for (const [name, muscle_group, equipment] of SEED_EXERCISES) {
      if (existingNames.has(String(name).toLowerCase())) continue;
      run(
        `
          INSERT INTO ${TRAINING_EXERCISES_TABLE}
            (user_id, name, muscle_group, equipment, notes, is_custom, created_on, updated_on)
          VALUES (NULL, ?, ?, ?, NULL, 0, ?, ?)
        `,
        [name, muscle_group, equipment, ts, ts]
      );
      existingNames.add(String(name).toLowerCase());
    }

    // Keep system exercise classifications in sync (e.g. Shadow Boxing → Cardio rounds).
    for (const [name, muscle_group, equipment] of SEED_EXERCISES) {
      run(
        `
          UPDATE ${TRAINING_EXERCISES_TABLE}
          SET muscle_group = ?, equipment = ?, updated_on = ?
          WHERE user_id IS NULL
            AND LOWER(name) = LOWER(?)
            AND (
              IFNULL(muscle_group, '') != ?
              OR IFNULL(equipment, '') != ?
            )
        `,
        [muscle_group, equipment, ts, name, muscle_group, equipment]
      );
    }
  };

  const assertTrainingAccess = (user) => {
    if (!user) throw new Error("Unauthorized.");
    if (!userCanAccessApp(user, "training")) {
      throw new Error("You do not have access to Training.");
    }
  };

  const resolveAthleteUserId = (actingUser, requestedUserId) => {
    const requested = requestedUserId === undefined || requestedUserId === null || requestedUserId === ""
      ? null
      : Number(requestedUserId);
    if (requested != null && Number.isFinite(requested) && requested !== actingUser.id) {
      if (!isSessionAdmin(actingUser)) {
        throw new Error("You can only access your own training data.");
      }
      const exists = all(`SELECT id FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`, [requested])[0];
      if (!exists) throw new Error("Athlete not found.");
      return requested;
    }
    return actingUser.id;
  };

  const athleteFromQuery = (url, actingUser) =>
    resolveAthleteUserId(actingUser, url.searchParams.get("user_id"));

  const athleteFromBody = (body, actingUser) =>
    resolveAthleteUserId(actingUser, body?.user_id);

  const isCardioMuscleGroup = (value) =>
    String(value || "")
      .trim()
      .toLowerCase() === "cardio";

  const nullableNumber = (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const epley1rm = (weight, reps) => {
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30) * 100) / 100;
  };

  const listExercises = (athleteId, q = "") => {
    const query = String(q || "").trim();
    if (query) {
      const like = `%${query}%`;
      return all(
        `
          SELECT *
          FROM ${TRAINING_EXERCISES_TABLE}
          WHERE (user_id IS NULL OR user_id = ?)
            AND (name LIKE ? OR IFNULL(muscle_group, '') LIKE ? OR IFNULL(equipment, '') LIKE ?)
          ORDER BY CASE WHEN user_id IS NULL THEN 1 ELSE 0 END, name
        `,
        [athleteId, like, like, like]
      );
    }
    return all(
      `
        SELECT *
        FROM ${TRAINING_EXERCISES_TABLE}
        WHERE user_id IS NULL OR user_id = ?
        ORDER BY CASE WHEN user_id IS NULL THEN 1 ELSE 0 END, name
      `,
      [athleteId]
    );
  };

  const getExerciseOrThrow = (exerciseId, athleteId) => {
    const row = all(
      `
        SELECT * FROM ${TRAINING_EXERCISES_TABLE}
        WHERE id = ? AND (user_id IS NULL OR user_id = ?)
        LIMIT 1
      `,
      [exerciseId, athleteId]
    )[0];
    if (!row) throw new Error("Exercise not found.");
    return row;
  };

  const createExercise = (athleteId, body, actingUserId) => {
    const name = String(body?.name || "").trim();
    if (!name) throw new Error("Exercise name is required.");
    const result = insertAuditedRow(
      TRAINING_EXERCISES_TABLE,
      {
        user_id: athleteId,
        name,
        muscle_group: String(body?.muscle_group || "").trim() || null,
        equipment: String(body?.equipment || "").trim() || null,
        notes: String(body?.notes || "").trim() || null,
        is_custom: 1,
      },
      actingUserId
    );
    return all(`SELECT * FROM ${TRAINING_EXERCISES_TABLE} WHERE id = ?`, [result.lastID])[0];
  };

  const updateExercise = (exerciseId, athleteId, body, actingUserId) => {
    const existing = getExerciseOrThrow(exerciseId, athleteId);
    if (!existing.is_custom || existing.user_id !== athleteId) {
      throw new Error("Only custom exercises can be edited.");
    }
    updateAuditedRow(
      TRAINING_EXERCISES_TABLE,
      {
        name: String(body?.name || existing.name).trim(),
        muscle_group:
          body?.muscle_group !== undefined
            ? String(body.muscle_group || "").trim() || null
            : existing.muscle_group,
        equipment:
          body?.equipment !== undefined
            ? String(body.equipment || "").trim() || null
            : existing.equipment,
        notes:
          body?.notes !== undefined ? String(body.notes || "").trim() || null : existing.notes,
      },
      "id = ? AND user_id = ?",
      [exerciseId, athleteId],
      actingUserId
    );
    return all(`SELECT * FROM ${TRAINING_EXERCISES_TABLE} WHERE id = ?`, [exerciseId])[0];
  };

  const deleteExercise = (exerciseId, athleteId, actingUserId) => {
    const existing = getExerciseOrThrow(exerciseId, athleteId);
    if (!existing.is_custom || existing.user_id !== athleteId) {
      throw new Error("Only custom exercises can be deleted.");
    }
    archiveAndDeleteRowsInternal(
      TRAINING_EXERCISES_TABLE,
      "id = ? AND user_id = ?",
      [exerciseId, athleteId],
      actingUserId
    );
  };

  const getRoutineExercises = (routineId) =>
    all(
      `
        SELECT re.*, e.name AS exercise_name, e.muscle_group, e.equipment
        FROM ${TRAINING_ROUTINE_EXERCISES_TABLE} re
        JOIN ${TRAINING_EXERCISES_TABLE} e ON e.id = re.exercise_id
        WHERE re.routine_id = ?
        ORDER BY re.sort_order, re.id
      `,
      [routineId]
    );

  const getRoutineOrThrow = (routineId, athleteId) => {
    const row = all(
      `SELECT * FROM ${TRAINING_ROUTINES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
      [routineId, athleteId]
    )[0];
    if (!row) throw new Error("Routine not found.");
    return { ...row, exercises: getRoutineExercises(routineId) };
  };

  const listRoutines = (athleteId) => {
    const routines = all(
      `
        SELECT r.*,
          (SELECT COUNT(*) FROM ${TRAINING_ROUTINE_EXERCISES_TABLE} re WHERE re.routine_id = r.id) AS exercise_count
        FROM ${TRAINING_ROUTINES_TABLE} r
        WHERE r.user_id = ?
        ORDER BY
          CASE WHEN r.plan_week IS NULL THEN 1 ELSE 0 END,
          r.plan_week ASC,
          CASE WHEN r.plan_day IS NULL THEN 1 ELSE 0 END,
          r.plan_day ASC,
          r.created_on ASC,
          r.id ASC
      `,
      [athleteId]
    );
    return routines;
  };

  const replaceRoutineExercises = (routineId, exercises, actingUserId) => {
    run(`DELETE FROM ${TRAINING_ROUTINE_EXERCISES_TABLE} WHERE routine_id = ?`, [routineId]);
    const list = Array.isArray(exercises) ? exercises : [];
    list.forEach((item, index) => {
      const exerciseId = Number(item.exercise_id);
      if (!Number.isFinite(exerciseId)) return;
      insertAuditedRow(
        TRAINING_ROUTINE_EXERCISES_TABLE,
        {
          routine_id: routineId,
          exercise_id: exerciseId,
          sort_order: Number(item.sort_order) || index + 1,
          superset_group:
            item.superset_group === null || item.superset_group === undefined || item.superset_group === ""
              ? null
              : Number(item.superset_group),
          target_sets: item.target_sets != null && item.target_sets !== "" ? Number(item.target_sets) : null,
          target_reps: item.target_reps != null && item.target_reps !== "" ? Number(item.target_reps) : null,
          target_weight:
            item.target_weight != null && item.target_weight !== "" ? Number(item.target_weight) : null,
          target_duration_mins:
            item.target_duration_mins != null && item.target_duration_mins !== ""
              ? Number(item.target_duration_mins)
              : null,
          target_distance:
            item.target_distance != null && item.target_distance !== ""
              ? Number(item.target_distance)
              : null,
          notes: String(item.notes || "").trim() || null,
        },
        actingUserId
      );
    });
  };

  const createRoutine = (athleteId, body, actingUserId) => {
    const name = String(body?.name || "").trim();
    if (!name) throw new Error("Routine name is required.");
    const planWeek =
      body?.plan_week === null || body?.plan_week === undefined || body?.plan_week === ""
        ? null
        : Number(body.plan_week);
    const planDay =
      body?.plan_day === null || body?.plan_day === undefined || body?.plan_day === ""
        ? null
        : Number(body.plan_day);
    const result = insertAuditedRow(
      TRAINING_ROUTINES_TABLE,
      {
        user_id: athleteId,
        name,
        notes: String(body?.notes || "").trim() || null,
        plan_week: Number.isFinite(planWeek) ? planWeek : null,
        plan_day: Number.isFinite(planDay) ? planDay : null,
      },
      actingUserId
    );
    replaceRoutineExercises(result.lastID, body?.exercises, actingUserId);
    return getRoutineOrThrow(result.lastID, athleteId);
  };

  const updateRoutine = (routineId, athleteId, body, actingUserId) => {
    getRoutineOrThrow(routineId, athleteId);
    const data = {
      name: String(body?.name || "").trim() || "Routine",
    };
    if (body?.notes !== undefined) {
      data.notes = String(body.notes || "").trim() || null;
    }
    updateAuditedRow(
      TRAINING_ROUTINES_TABLE,
      data,
      "id = ? AND user_id = ?",
      [routineId, athleteId],
      actingUserId
    );
    if (Array.isArray(body?.exercises)) {
      replaceRoutineExercises(routineId, body.exercises, actingUserId);
    }
    return getRoutineOrThrow(routineId, athleteId);
  };

  const deleteRoutine = (routineId, athleteId, actingUserId) => {
    getRoutineOrThrow(routineId, athleteId);
    run(`DELETE FROM ${TRAINING_ROUTINE_EXERCISES_TABLE} WHERE routine_id = ?`, [routineId]);
    archiveAndDeleteRowsInternal(
      TRAINING_ROUTINES_TABLE,
      "id = ? AND user_id = ?",
      [routineId, athleteId],
      actingUserId
    );
  };

  const getSetsForWorkoutExercise = (workoutExerciseId) =>
    all(
      `
        SELECT * FROM ${TRAINING_WORKOUT_SETS_TABLE}
        WHERE workout_exercise_id = ?
        ORDER BY set_index, id
      `,
      [workoutExerciseId]
    );

  const getWorkoutExercises = (workoutId) => {
    const rows = all(
      `
        SELECT we.*, e.name AS exercise_name, e.muscle_group, e.equipment
        FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} we
        JOIN ${TRAINING_EXERCISES_TABLE} e ON e.id = we.exercise_id
        WHERE we.workout_id = ?
        ORDER BY we.sort_order, we.id
      `,
      [workoutId]
    );
    return rows.map((row) => ({ ...row, sets: getSetsForWorkoutExercise(row.id) }));
  };

  const getWorkoutOrThrow = (workoutId, athleteId) => {
    const row = all(
      `SELECT * FROM ${TRAINING_WORKOUTS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
      [workoutId, athleteId]
    )[0];
    if (!row) throw new Error("Workout not found.");
    return { ...row, exercises: getWorkoutExercises(workoutId) };
  };

  const getPreviousExerciseSets = (athleteId, exerciseId, beforeWorkoutId = null) => {
    const params = [athleteId, exerciseId];
    let beforeClause = "";
    if (beforeWorkoutId) {
      beforeClause = "AND w.id != ?";
      params.push(beforeWorkoutId);
    }
    const lastWe = all(
      `
        SELECT we.id
        FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} we
        JOIN ${TRAINING_WORKOUTS_TABLE} w ON w.id = we.workout_id
        WHERE w.user_id = ?
          AND w.status = 'completed'
          AND we.exercise_id = ?
          ${beforeClause}
        ORDER BY IFNULL(w.completed_at, w.started_at) DESC, w.id DESC
        LIMIT 1
      `,
      params
    )[0];
    if (!lastWe) return [];
    return getSetsForWorkoutExercise(lastWe.id).filter((set) => !set.is_warmup);
  };

  const startWorkout = (athleteId, body, actingUserId) => {
    const active = all(
      `
        SELECT id FROM ${TRAINING_WORKOUTS_TABLE}
        WHERE user_id = ? AND status = 'active'
        ORDER BY started_at DESC, id DESC
        LIMIT 1
      `,
      [athleteId]
    )[0];
    if (active) {
      return getWorkoutOrThrow(active.id, athleteId);
    }

    let name = String(body?.name || "").trim();
    let routineId = body?.routine_id ? Number(body.routine_id) : null;
    let routine = null;
    if (routineId) {
      routine = getRoutineOrThrow(routineId, athleteId);
      if (!name) name = routine.name;
    }
    if (!name) name = "Workout";

    const result = insertAuditedRow(
      TRAINING_WORKOUTS_TABLE,
      {
        user_id: athleteId,
        routine_id: routineId,
        name,
        started_at: stamp(),
        status: "active",
        notes: String(body?.notes || "").trim() || null,
      },
      actingUserId
    );

    if (routine?.exercises?.length) {
      routine.exercises.forEach((item, index) => {
        const we = insertAuditedRow(
          TRAINING_WORKOUT_EXERCISES_TABLE,
          {
            workout_id: result.lastID,
            exercise_id: item.exercise_id,
            sort_order: item.sort_order || index + 1,
            superset_group: item.superset_group ?? null,
            notes: item.notes ?? null,
          },
          actingUserId
        );
        const cardio = isCardioMuscleGroup(item.muscle_group);
        const defaultSets = cardio ? 1 : 3;
        const targetSets = Number(item.target_sets) > 0 ? Number(item.target_sets) : defaultSets;
        for (let setIndex = 1; setIndex <= targetSets; setIndex += 1) {
          insertAuditedRow(
            TRAINING_WORKOUT_SETS_TABLE,
            {
              workout_exercise_id: we.lastID,
              set_index: setIndex,
              weight: cardio ? null : item.target_weight ?? null,
              reps: cardio ? null : item.target_reps ?? null,
              duration_mins: cardio ? item.target_duration_mins ?? null : null,
              distance: cardio ? item.target_distance ?? null : null,
              rpe: null,
              is_warmup: 0,
              completed_at: null,
            },
            actingUserId
          );
        }
      });
    }

    return getWorkoutOrThrow(result.lastID, athleteId);
  };

  const getActiveWorkout = (athleteId) => {
    const row = all(
      `
        SELECT id FROM ${TRAINING_WORKOUTS_TABLE}
        WHERE user_id = ? AND status = 'active'
        ORDER BY started_at DESC, id DESC
        LIMIT 1
      `,
      [athleteId]
    )[0];
    return row ? getWorkoutOrThrow(row.id, athleteId) : null;
  };

  const listWorkouts = (athleteId, status = null, limit = 50) => {
    const params = [athleteId];
    let statusClause = "";
    if (status) {
      statusClause = "AND status = ?";
      params.push(status);
    }
    params.push(Math.min(Number(limit) || 50, 200));
    return all(
      `
        SELECT *
        FROM ${TRAINING_WORKOUTS_TABLE}
        WHERE user_id = ? ${statusClause}
        ORDER BY IFNULL(completed_at, started_at) DESC, id DESC
        LIMIT ?
      `,
      params
    );
  };

  const assertWorkoutOwned = (workoutId, athleteId) => {
    const row = all(
      `SELECT * FROM ${TRAINING_WORKOUTS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
      [workoutId, athleteId]
    )[0];
    if (!row) throw new Error("Workout not found.");
    return row;
  };

  /** Active sessions and completed history can be edited; abandoned stays read-only. */
  const assertWorkoutEditable = (workout) => {
    if (workout.status !== "active" && workout.status !== "completed") {
      throw new Error("Only active or completed workouts can be edited.");
    }
    return workout;
  };

  const addWorkoutExercise = (workoutId, athleteId, body, actingUserId) => {
    const workout = assertWorkoutEditable(assertWorkoutOwned(workoutId, athleteId));
    const exerciseId = Number(body?.exercise_id);
    getExerciseOrThrow(exerciseId, athleteId);
    const maxSort =
      all(
        `SELECT MAX(sort_order) AS max_sort FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} WHERE workout_id = ?`,
        [workoutId]
      )[0]?.max_sort ?? 0;
    const result = insertAuditedRow(
      TRAINING_WORKOUT_EXERCISES_TABLE,
      {
        workout_id: workoutId,
        exercise_id: exerciseId,
        sort_order: Number(body?.sort_order) || Number(maxSort) + 1,
        superset_group:
          body?.superset_group === null || body?.superset_group === undefined || body?.superset_group === ""
            ? null
            : Number(body.superset_group),
        notes: String(body?.notes || "").trim() || null,
      },
      actingUserId
    );
    const exerciseMeta = all(
      `SELECT muscle_group FROM ${TRAINING_EXERCISES_TABLE} WHERE id = ?`,
      [exerciseId]
    )[0];
    const cardio = isCardioMuscleGroup(exerciseMeta?.muscle_group);
    const previous = getPreviousExerciseSets(athleteId, exerciseId, workoutId);
    const seedCount = previous.length > 0 ? previous.length : cardio ? 1 : 3;
    for (let setIndex = 1; setIndex <= seedCount; setIndex += 1) {
      const prev = previous[setIndex - 1];
      insertAuditedRow(
        TRAINING_WORKOUT_SETS_TABLE,
        {
          workout_exercise_id: result.lastID,
          set_index: setIndex,
          weight: cardio ? null : prev?.weight ?? null,
          reps: cardio ? null : prev?.reps ?? null,
          duration_mins: cardio ? prev?.duration_mins ?? null : null,
          distance: cardio ? prev?.distance ?? null : null,
          rpe: null,
          is_warmup: 0,
          completed_at: null,
        },
        actingUserId
      );
    }
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const updateWorkoutExercise = (workoutId, athleteId, weId, body, actingUserId) => {
    assertWorkoutEditable(assertWorkoutOwned(workoutId, athleteId));
    const existing = all(
      `SELECT * FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} WHERE id = ? AND workout_id = ?`,
      [weId, workoutId]
    )[0];
    if (!existing) throw new Error("Workout exercise not found.");
    updateAuditedRow(
      TRAINING_WORKOUT_EXERCISES_TABLE,
      {
        sort_order: body?.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order,
        superset_group:
          body?.superset_group !== undefined
            ? body.superset_group === null || body.superset_group === ""
              ? null
              : Number(body.superset_group)
            : existing.superset_group,
        notes:
          body?.notes !== undefined ? String(body.notes || "").trim() || null : existing.notes,
      },
      "id = ?",
      [weId],
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const deleteWorkoutExercise = (workoutId, athleteId, weId, actingUserId) => {
    assertWorkoutEditable(assertWorkoutOwned(workoutId, athleteId));
    const existing = all(
      `SELECT * FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} WHERE id = ? AND workout_id = ?`,
      [weId, workoutId]
    )[0];
    if (!existing) throw new Error("Workout exercise not found.");
    run(`DELETE FROM ${TRAINING_WORKOUT_SETS_TABLE} WHERE workout_exercise_id = ?`, [weId]);
    archiveAndDeleteRowsInternal(
      TRAINING_WORKOUT_EXERCISES_TABLE,
      "id = ?",
      [weId],
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const addSet = (workoutId, athleteId, weId, body, actingUserId) => {
    assertWorkoutEditable(assertWorkoutOwned(workoutId, athleteId));
    const existing = all(
      `SELECT * FROM ${TRAINING_WORKOUT_EXERCISES_TABLE} WHERE id = ? AND workout_id = ?`,
      [weId, workoutId]
    )[0];
    if (!existing) throw new Error("Workout exercise not found.");
    const maxIndex =
      all(
        `SELECT MAX(set_index) AS max_index FROM ${TRAINING_WORKOUT_SETS_TABLE} WHERE workout_exercise_id = ?`,
        [weId]
      )[0]?.max_index ?? 0;
    insertAuditedRow(
      TRAINING_WORKOUT_SETS_TABLE,
      {
        workout_exercise_id: weId,
        set_index: Number(body?.set_index) || Number(maxIndex) + 1,
        weight: body?.weight !== undefined && body?.weight !== "" ? Number(body.weight) : null,
        reps: body?.reps !== undefined && body?.reps !== "" ? Number(body.reps) : null,
        duration_mins:
          body?.duration_mins !== undefined && body?.duration_mins !== ""
            ? Number(body.duration_mins)
            : null,
        distance:
          body?.distance !== undefined && body?.distance !== "" ? Number(body.distance) : null,
        rpe: body?.rpe !== undefined && body?.rpe !== "" ? Number(body.rpe) : null,
        is_warmup: body?.is_warmup ? 1 : 0,
        completed_at: body?.complete ? stamp() : null,
      },
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const updateSet = (setId, athleteId, body, actingUserId) => {
    const setRow = all(
      `
        SELECT s.*, w.id AS workout_id, w.status, w.user_id
        FROM ${TRAINING_WORKOUT_SETS_TABLE} s
        JOIN ${TRAINING_WORKOUT_EXERCISES_TABLE} we ON we.id = s.workout_exercise_id
        JOIN ${TRAINING_WORKOUTS_TABLE} w ON w.id = we.workout_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [setId]
    )[0];
    if (!setRow || setRow.user_id !== athleteId) throw new Error("Set not found.");
    assertWorkoutEditable(setRow);

    const next = {
      weight: body?.weight !== undefined ? nullableNumber(body.weight) : setRow.weight,
      reps: body?.reps !== undefined ? nullableNumber(body.reps) : setRow.reps,
      duration_mins:
        body?.duration_mins !== undefined
          ? nullableNumber(body.duration_mins)
          : setRow.duration_mins,
      distance: body?.distance !== undefined ? nullableNumber(body.distance) : setRow.distance,
      rpe: body?.rpe !== undefined ? nullableNumber(body.rpe) : setRow.rpe,
      is_warmup: body?.is_warmup !== undefined ? (body.is_warmup ? 1 : 0) : setRow.is_warmup,
      set_index: body?.set_index !== undefined ? Number(body.set_index) : setRow.set_index,
      completed_at: setRow.completed_at,
    };

    if (body?.complete === true) next.completed_at = stamp();
    if (body?.complete === false) next.completed_at = null;

    updateAuditedRow(TRAINING_WORKOUT_SETS_TABLE, next, "id = ?", [setId], actingUserId);
    return getWorkoutOrThrow(setRow.workout_id, athleteId);
  };

  const deleteSet = (setId, athleteId, actingUserId) => {
    const setRow = all(
      `
        SELECT s.*, w.id AS workout_id, w.status, w.user_id
        FROM ${TRAINING_WORKOUT_SETS_TABLE} s
        JOIN ${TRAINING_WORKOUT_EXERCISES_TABLE} we ON we.id = s.workout_exercise_id
        JOIN ${TRAINING_WORKOUTS_TABLE} w ON w.id = we.workout_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [setId]
    )[0];
    if (!setRow || setRow.user_id !== athleteId) throw new Error("Set not found.");
    assertWorkoutEditable(setRow);
    archiveAndDeleteRowsInternal(TRAINING_WORKOUT_SETS_TABLE, "id = ?", [setId], actingUserId);
    return getWorkoutOrThrow(setRow.workout_id, athleteId);
  };

  const completeWorkout = (workoutId, athleteId, body, actingUserId) => {
    const workout = assertWorkoutOwned(workoutId, athleteId);
    if (workout.status !== "active") throw new Error("Workout is not active.");
    updateAuditedRow(
      TRAINING_WORKOUTS_TABLE,
      {
        status: "completed",
        completed_at: stamp(),
        notes:
          body?.notes !== undefined ? String(body.notes || "").trim() || null : workout.notes,
        name: body?.name !== undefined ? String(body.name || "").trim() || workout.name : workout.name,
      },
      "id = ? AND user_id = ?",
      [workoutId, athleteId],
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const abandonWorkout = (workoutId, athleteId, actingUserId) => {
    const workout = assertWorkoutOwned(workoutId, athleteId);
    if (workout.status !== "active") throw new Error("Workout is not active.");
    updateAuditedRow(
      TRAINING_WORKOUTS_TABLE,
      { status: "abandoned", completed_at: stamp() },
      "id = ? AND user_id = ?",
      [workoutId, athleteId],
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const updateWorkoutMeta = (workoutId, athleteId, body, actingUserId) => {
    const workout = assertWorkoutOwned(workoutId, athleteId);
    updateAuditedRow(
      TRAINING_WORKOUTS_TABLE,
      {
        name: body?.name !== undefined ? String(body.name || "").trim() || workout.name : workout.name,
        notes:
          body?.notes !== undefined ? String(body.notes || "").trim() || null : workout.notes,
      },
      "id = ? AND user_id = ?",
      [workoutId, athleteId],
      actingUserId
    );
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const weekStartKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + mondayOffset);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  };

  const getProgress = (athleteId, exerciseId = null) => {
    const params = [athleteId];
    let exerciseClause = "";
    if (exerciseId) {
      exerciseClause = "AND we.exercise_id = ?";
      params.push(Number(exerciseId));
    }

    const sets = all(
      `
        SELECT
          we.exercise_id,
          e.name AS exercise_name,
          IFNULL(NULLIF(TRIM(e.muscle_group), ''), 'Other') AS muscle_group,
          w.id AS workout_id,
          IFNULL(w.completed_at, w.started_at) AS performed_at,
          s.weight,
          s.reps,
          s.duration_mins,
          s.distance,
          s.rpe,
          s.is_warmup
        FROM ${TRAINING_WORKOUT_SETS_TABLE} s
        JOIN ${TRAINING_WORKOUT_EXERCISES_TABLE} we ON we.id = s.workout_exercise_id
        JOIN ${TRAINING_WORKOUTS_TABLE} w ON w.id = we.workout_id
        JOIN ${TRAINING_EXERCISES_TABLE} e ON e.id = we.exercise_id
        WHERE w.user_id = ?
          AND w.status = 'completed'
          AND s.completed_at IS NOT NULL
          AND IFNULL(s.is_warmup, 0) = 0
          AND (
            (LOWER(IFNULL(e.muscle_group, '')) = 'cardio' AND s.duration_mins IS NOT NULL)
            OR (
              LOWER(IFNULL(e.muscle_group, '')) != 'cardio'
              AND s.weight IS NOT NULL
              AND s.reps IS NOT NULL
            )
          )
          ${exerciseClause}
        ORDER BY performed_at ASC, s.id ASC
      `,
      params
    );

    const byExercise = new Map();
    const weeklyVolumeMap = new Map();
    const weeklyCardioMap = new Map();
    const muscleVolumeMap = new Map();
    const workoutDays = new Set();

    for (const row of sets) {
      const key = String(row.exercise_id);
      const cardio = isCardioMuscleGroup(row.muscle_group);
      if (!byExercise.has(key)) {
        byExercise.set(key, {
          exercise_id: row.exercise_id,
          exercise_name: row.exercise_name,
          muscle_group: row.muscle_group,
          is_cardio: cardio,
          best_weight: 0,
          best_reps: 0,
          best_e1rm: 0,
          best_volume_set: 0,
          total_volume: 0,
          best_duration_mins: 0,
          best_distance: 0,
          total_duration_mins: 0,
          total_distance: 0,
          points: [],
        });
      }
      const entry = byExercise.get(key);

      if (cardio) {
        const duration = Number(row.duration_mins) || 0;
        const distance = row.distance != null ? Number(row.distance) : null;
        if (duration > entry.best_duration_mins) entry.best_duration_mins = duration;
        if (distance != null && distance > entry.best_distance) entry.best_distance = distance;
        entry.total_duration_mins += duration;
        if (distance != null) entry.total_distance += distance;
        entry.points.push({
          performed_at: row.performed_at,
          duration_mins: duration,
          distance,
          rpe: row.rpe,
        });

        const week = weekStartKey(row.performed_at);
        if (week) {
          weeklyCardioMap.set(week, (weeklyCardioMap.get(week) || 0) + duration);
        }
      } else {
        const e1rm = epley1rm(row.weight, row.reps) || 0;
        const volume = Number(row.weight) * Number(row.reps);
        if (e1rm > entry.best_e1rm) {
          entry.best_e1rm = e1rm;
          entry.best_weight = Number(row.weight);
          entry.best_reps = Number(row.reps);
        }
        if (volume > entry.best_volume_set) entry.best_volume_set = volume;
        entry.total_volume += volume;
        entry.points.push({
          performed_at: row.performed_at,
          weight: Number(row.weight),
          reps: Number(row.reps),
          e1rm,
          volume,
          rpe: row.rpe,
        });

        const week = weekStartKey(row.performed_at);
        if (week) {
          weeklyVolumeMap.set(week, (weeklyVolumeMap.get(week) || 0) + volume);
        }
        const muscle = row.muscle_group || "Other";
        muscleVolumeMap.set(muscle, (muscleVolumeMap.get(muscle) || 0) + volume);
      }

      const day = String(row.performed_at || "").slice(0, 10);
      if (day) workoutDays.add(day);
    }

    const exercises = [...byExercise.values()].sort((a, b) =>
      a.exercise_name.localeCompare(b.exercise_name)
    );

    const recentPrs = exercises
      .filter((item) => item.points.length > 0)
      .map((item) => {
        const last = item.points[item.points.length - 1];
        if (item.is_cardio) {
          return {
            exercise_id: item.exercise_id,
            exercise_name: item.exercise_name,
            is_cardio: true,
            duration_mins: item.best_duration_mins,
            distance: item.best_distance || null,
            last_performed_at: last.performed_at,
          };
        }
        return {
          exercise_id: item.exercise_id,
          exercise_name: item.exercise_name,
          is_cardio: false,
          weight: item.best_weight,
          reps: item.best_reps,
          e1rm: item.best_e1rm,
          last_performed_at: last.performed_at,
        };
      })
      .sort((a, b) => String(b.last_performed_at).localeCompare(String(a.last_performed_at)))
      .slice(0, 8);

    const weeklyVolume = [...weeklyVolumeMap.entries()]
      .map(([week_start, volume]) => ({
        week_start,
        volume: Math.round(volume),
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
      .slice(-16);

    const weeklyCardio = [...weeklyCardioMap.entries()]
      .map(([week_start, duration_mins]) => ({
        week_start,
        duration_mins: Math.round(duration_mins * 10) / 10,
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
      .slice(-16);

    const muscleVolume = [...muscleVolumeMap.entries()]
      .map(([muscle_group, volume]) => ({
        muscle_group,
        volume: Math.round(volume),
      }))
      .sort((a, b) => b.volume - a.volume);

    const topByE1rm = [...exercises]
      .filter((item) => !item.is_cardio && item.best_e1rm > 0)
      .sort((a, b) => b.best_e1rm - a.best_e1rm)
      .slice(0, 8)
      .map((item) => ({
        exercise_name: item.exercise_name,
        e1rm: item.best_e1rm,
      }));

    return {
      exercises,
      recent_prs: recentPrs,
      weekly_volume: weeklyVolume,
      weekly_cardio_mins: weeklyCardio,
      muscle_volume: muscleVolume,
      top_by_e1rm: topByE1rm,
      workout_day_count: workoutDays.size,
    };
  };

  const getSummary = (athleteId) => {
    const workoutCount =
      all(
        `SELECT COUNT(*) AS count FROM ${TRAINING_WORKOUTS_TABLE} WHERE user_id = ? AND status = 'completed'`,
        [athleteId]
      )[0]?.count ?? 0;
    const routineCount =
      all(`SELECT COUNT(*) AS count FROM ${TRAINING_ROUTINES_TABLE} WHERE user_id = ?`, [
        athleteId,
      ])[0]?.count ?? 0;
    const active = getActiveWorkout(athleteId);
    const recent = listWorkouts(athleteId, "completed", 5);
    const progress = getProgress(athleteId);
    const latestWeight = all(
      `
        SELECT body_weight, measured_on
        FROM ${TRAINING_MEASUREMENTS_TABLE}
        WHERE user_id = ? AND body_weight IS NOT NULL
        ORDER BY measured_on DESC, id DESC
        LIMIT 1
      `,
      [athleteId]
    )[0];

    return {
      completed_workout_count: Number(workoutCount),
      routine_count: Number(routineCount),
      active_workout: active,
      recent_workouts: recent,
      recent_prs: progress.recent_prs,
      latest_body_weight: latestWeight || null,
    };
  };

  const normalizeGoals = (raw) => {
    const list = Array.isArray(raw) ? raw : [];
    return [0, 1, 2].map((index) => String(list[index] || "").trim());
  };

  const getAiGoals = (athleteId) => {
    const row = all(
      `
        SELECT pref_value
        FROM ${USER_PREFERENCES_TABLE}
        WHERE user_id = ? AND pref_key = ?
        LIMIT 1
      `,
      [athleteId, TRAINING_AI_GOALS_PREF]
    )[0];
    if (!row) return { goals: ["", "", ""] };
    try {
      const parsed = JSON.parse(row.pref_value);
      return { goals: normalizeGoals(parsed?.goals ?? parsed) };
    } catch {
      return { goals: ["", "", ""] };
    }
  };

  const saveAiGoals = (athleteId, body, actingUserId) => {
    const goals = normalizeGoals(body?.goals);
    const valueJson = JSON.stringify({ goals });
    const existing = all(
      `
        SELECT id FROM ${USER_PREFERENCES_TABLE}
        WHERE user_id = ? AND pref_key = ?
        LIMIT 1
      `,
      [athleteId, TRAINING_AI_GOALS_PREF]
    )[0];
    if (existing) {
      updateAuditedRow(
        USER_PREFERENCES_TABLE,
        { pref_value: valueJson },
        "id = ?",
        [existing.id],
        actingUserId
      );
    } else {
      insertAuditedRow(
        USER_PREFERENCES_TABLE,
        {
          user_id: athleteId,
          pref_key: TRAINING_AI_GOALS_PREF,
          pref_value: valueJson,
        },
        actingUserId
      );
    }
    return { goals };
  };

  const buildLibraryCatalog = (athleteId) => {
    const rows = listExercises(athleteId);
    return rows.slice(0, 260).map((row) => ({
      id: row.id,
      name: row.name,
      muscle_group: row.muscle_group || "",
      equipment: row.equipment || "",
    }));
  };

  const buildHistoryContext = (athleteId) => {
    const recent = listWorkouts(athleteId, "completed", 8);
    const progress = getProgress(athleteId);
    const recentDetails = recent.map((workout) => {
      const full = getWorkoutOrThrow(workout.id, athleteId);
      return {
        name: full.name,
        completed_at: full.completed_at,
        exercises: (full.exercises || []).map((exercise) => {
          const cardio = isCardioMuscleGroup(exercise.muscle_group);
          const doneSets = (exercise.sets || []).filter((set) => set.completed_at && !set.is_warmup);
          if (cardio) {
            const mins = doneSets.reduce((sum, set) => sum + (Number(set.duration_mins) || 0), 0);
            return {
              name: exercise.exercise_name,
              muscle_group: exercise.muscle_group,
              duration_mins: Math.round(mins * 10) / 10,
            };
          }
          const best = doneSets.reduce(
            (acc, set) => {
              const e1rm = epley1rm(set.weight, set.reps) || 0;
              return e1rm > acc.e1rm
                ? { weight: set.weight, reps: set.reps, e1rm }
                : acc;
            },
            { weight: null, reps: null, e1rm: 0 }
          );
          return {
            name: exercise.exercise_name,
            muscle_group: exercise.muscle_group,
            best_set:
              best.weight != null ? `${best.weight}x${best.reps}` : null,
          };
        }),
      };
    });

    return {
      recent_workouts: recentDetails,
      recent_prs: (progress.recent_prs || []).slice(0, 10),
    };
  };

  const resolveExerciseByName = (library, name) => {
    const needle = String(name || "")
      .trim()
      .toLowerCase();
    if (!needle) return null;
    const exact = library.find((row) => String(row.name).toLowerCase() === needle);
    if (exact) return exact;
    const contains = library.find((row) => {
      const n = String(row.name).toLowerCase();
      return n.includes(needle) || needle.includes(n);
    });
    return contains || null;
  };

  const mapAiExercisesToPlan = (library, aiExercises) => {
    const plan = [];
    const skipped = [];
    for (const item of Array.isArray(aiExercises) ? aiExercises : []) {
      const match = resolveExerciseByName(library, item?.name);
      if (!match) {
        skipped.push(String(item?.name || "").trim());
        continue;
      }
      const cardio = isCardioMuscleGroup(match.muscle_group);
      plan.push({
        exercise_id: match.id,
        exercise_name: match.name,
        muscle_group: match.muscle_group,
        sort_order: plan.length + 1,
        target_sets:
          item?.target_sets != null && item.target_sets !== ""
            ? Number(item.target_sets)
            : cardio
              ? 1
              : 3,
        target_reps: cardio
          ? null
          : item?.target_reps != null && item.target_reps !== ""
            ? Number(item.target_reps)
            : 8,
        target_weight:
          !cardio && item?.target_weight != null && item.target_weight !== ""
            ? Number(item.target_weight)
            : null,
        target_duration_mins: cardio
          ? item?.target_duration_mins != null && item.target_duration_mins !== ""
            ? Number(item.target_duration_mins)
            : 10
          : null,
        target_distance:
          cardio && item?.target_distance != null && item.target_distance !== ""
            ? Number(item.target_distance)
            : null,
        notes: String(item?.notes || "").trim() || null,
      });
    }
    return { plan, skipped };
  };

  const seedPlanIntoWorkout = (workoutId, athleteId, plan, actingUserId) => {
    plan.forEach((item, index) => {
      const we = insertAuditedRow(
        TRAINING_WORKOUT_EXERCISES_TABLE,
        {
          workout_id: workoutId,
          exercise_id: item.exercise_id,
          sort_order: item.sort_order || index + 1,
          superset_group: null,
          notes: item.notes ?? null,
        },
        actingUserId
      );
      const cardio = isCardioMuscleGroup(item.muscle_group);
      const targetSets = Number(item.target_sets) > 0 ? Number(item.target_sets) : cardio ? 1 : 3;
      for (let setIndex = 1; setIndex <= targetSets; setIndex += 1) {
        insertAuditedRow(
          TRAINING_WORKOUT_SETS_TABLE,
          {
            workout_exercise_id: we.lastID,
            set_index: setIndex,
            weight: cardio ? null : item.target_weight ?? null,
            reps: cardio ? null : item.target_reps ?? null,
            duration_mins: cardio ? item.target_duration_mins ?? null : null,
            distance: cardio ? item.target_distance ?? null : null,
            rpe: null,
            is_warmup: 0,
            completed_at: null,
          },
          actingUserId
        );
      }
    });
    return getWorkoutOrThrow(workoutId, athleteId);
  };

  const generateAiRoutine = async (athleteId, body, actingUserId) => {
    if (typeof callGeminiJson !== "function") {
      throw new Error("AI is not available on this server.");
    }
    const goals = normalizeGoals(body?.goals);
    if (goals.some((goal) => !goal)) {
      throw new Error("Enter three goals before generating a routine.");
    }
    saveAiGoals(athleteId, { goals }, actingUserId);

    const library = buildLibraryCatalog(athleteId);
    const history = buildHistoryContext(athleteId);
    const prompt = [
      "You are a strength & conditioning coach for a personal training app.",
      "Create a FULL multi-week WORKOUT PLAN (not a single session).",
      "Duration: 5 or 6 weeks. Each week must list every day (Mon–Sun or Day 1–7).",
      "Mark rest / recovery days with is_rest=true and an empty exercises array.",
      "Training days: 3–6 sessions per week with clear focuses (e.g. Push, Pull, Legs, Full body, Conditioning, Striking, Grappling).",
      "Progress week to week (volume, intensity, or duration). Use ONLY exercise names from the library.",
      "If goals mention fighting shape, boxing, kickboxing, MMA, martial arts, or combat sports, include Martial arts / striking / grappling drills and mobility from the library when appropriate (mixed with strength/conditioning).",
      "Do not force martial arts into unrelated goals; only use them when they fit.",
      "Consider recent workout history and PRs; do not overuse lifts they just hammered.",
      "For Cardio (including Shadow Boxing / bag / pad rounds) use target_sets as rounds and target_duration_mins as minutes per round.",
      "For Martial arts skill drills (combos, kicks, footwork) and strength exercises use target_sets and target_reps; target_weight optional.",
      "For Mobility stretches use short target_sets with target_reps (holds counted as reps) unless timed Cardio holds fit better.",
      "Return ONLY JSON:",
      "{",
      '  "name": string (plan title),',
      '  "notes": string (how to run the plan),',
      '  "weeks": [',
      "    {",
      '      "week": number,',
      '      "focus": string,',
      '      "days": [',
      "        {",
      '          "day_label": string (e.g. Mon or Day 1),',
      '          "session_name": string,',
      '          "is_rest": boolean,',
      '          "exercises": [',
      "            {",
      '              "name": string,',
      '              "target_sets": number,',
      '              "target_reps": number|null,',
      '              "target_weight": number|null,',
      '              "target_duration_mins": number|null,',
      '              "target_distance": number|null,',
      '              "notes": string|null',
      "            }",
      "          ]",
      "        }",
      "      ]",
      "    }",
      "  ]",
      "}",
      "Keep each training day to about 4–10 exercises.",
      "",
      `Goals:\n1) ${goals[0]}\n2) ${goals[1]}\n3) ${goals[2]}`,
      "",
      `Recent history JSON:\n${JSON.stringify(history)}`,
      "",
      `Exercise library JSON:\n${JSON.stringify(library)}`,
    ].join("\n");

    let parsed;
    try {
      parsed = await callGeminiJson({
        prompt,
        temperature: 0.45,
        emptyError: "Gemini returned an empty plan response.",
        parseError: "Could not parse workout plan JSON from Gemini.",
      });
    } catch (error) {
      if (/not configured|GEMINI_API_KEY/i.test(error.message)) {
        throw new Error(
          "Training AI is not configured. Add GEMINI_API_KEY to your .env file and restart the server."
        );
      }
      throw error;
    }

    const weeksRaw = Array.isArray(parsed?.weeks) ? parsed.weeks : [];
    if (weeksRaw.length < 5) {
      throw new Error("AI did not return a 5–6 week plan. Try generating again.");
    }

    const shortGoal = goals[0].slice(0, 36);
    const planName =
      String(parsed?.name || "").trim() ||
      `AI Plan: ${shortGoal}${shortGoal.length >= 36 ? "…" : ""}`;
    const planNotes = [
      String(parsed?.notes || "").trim(),
      `Goals: ${goals.join(" · ")}`,
      `${Math.min(weeksRaw.length, 6)}-week day-by-day plan generated by AI Coach.`,
    ]
      .filter(Boolean)
      .join("\n");

    const weeks = [];
    const routines = [];
    const allSkipped = new Set();
    let trainingDayCount = 0;

    for (const weekEntry of weeksRaw.slice(0, 6)) {
      const weekNumber = Number(weekEntry?.week) || weeks.length + 1;
      const weekFocus = String(weekEntry?.focus || "").trim() || `Week ${weekNumber}`;
      const daysOut = [];
      const days = Array.isArray(weekEntry?.days) ? weekEntry.days : [];
      let dayIndex = 0;

      for (const dayEntry of days) {
        dayIndex += 1;
        const dayLabel = String(dayEntry?.day_label || "").trim() || "Day";
        const sessionName =
          String(dayEntry?.session_name || "").trim() || dayLabel;
        const isRest = Boolean(dayEntry?.is_rest) || !Array.isArray(dayEntry?.exercises) || dayEntry.exercises.length === 0;

        if (isRest) {
          daysOut.push({
            day_label: dayLabel,
            session_name: sessionName || "Rest",
            is_rest: true,
            routine_id: null,
            exercise_count: 0,
          });
          continue;
        }

        const { plan, skipped } = mapAiExercisesToPlan(library, dayEntry.exercises);
        skipped.forEach((name) => allSkipped.add(name));
        if (plan.length < 2) {
          daysOut.push({
            day_label: dayLabel,
            session_name: sessionName,
            is_rest: true,
            routine_id: null,
            exercise_count: 0,
            note: "Marked rest — too few mappable exercises.",
          });
          continue;
        }

        const routineName = `${planName} · W${weekNumber} · ${dayLabel} · ${sessionName}`.slice(
          0,
          120
        );
        const routine = createRoutine(
          athleteId,
          {
            name: routineName,
            notes: [
              planNotes,
              `Week ${weekNumber} focus: ${weekFocus}`,
              `Day: ${dayLabel} — ${sessionName}`,
            ].join("\n"),
            plan_week: weekNumber,
            plan_day: dayIndex,
            exercises: plan,
          },
          actingUserId
        );
        trainingDayCount += 1;
        routines.push(routine);
        daysOut.push({
          day_label: dayLabel,
          session_name: sessionName,
          is_rest: false,
          routine_id: routine.id,
          routine_name: routine.name,
          exercise_count: plan.length,
        });
      }

      weeks.push({
        week: weekNumber,
        focus: weekFocus,
        days: daysOut,
      });
    }

    if (trainingDayCount < 8) {
      throw new Error(
        `Plan only mapped ${trainingDayCount} training days. Try generating again with clearer goals.`
      );
    }

    return {
      plan: {
        name: planName,
        notes: planNotes,
        week_count: weeks.length,
        training_day_count: trainingDayCount,
        weeks,
      },
      routines,
      skipped: [...allSkipped],
      // Back-compat for older clients expecting a single routine.
      routine: routines[0] || null,
    };
  };

  const generateAiHiit = async (athleteId) => {
    if (typeof callGeminiJson !== "function") {
      throw new Error("AI is not available on this server.");
    }

    const library = buildLibraryCatalog(athleteId);
    const history = buildHistoryContext(athleteId);
    const prompt = [
      "You are programming a fun CrossFit-style / HIIT daily workout (WOD).",
      "Create a 12-25 minute session using ONLY names from the exercise library.",
      "Mix bodyweight, cardio machines, and a few strength moves. Randomize the stimulus.",
      "You may include boxing, kickboxing, martial arts drills, or mobility when it fits a fight-conditioning style WOD — optional, not required every time.",
      "Avoid repeating the exact same recent workout pattern from history.",
      "For Cardio items (Shadow Boxing, bag/pad rounds, machines) use target_sets as rounds and target_duration_mins as minutes per round.",
      "For Martial arts skill drills and strength use short sets/reps.",
      "Return ONLY JSON:",
      "{",
      '  "name": string,',
      '  "notes": string (brief WOD description / how to run it),',
      '  "exercises": [',
      "    {",
      '      "name": string,',
      '      "target_sets": number,',
      '      "target_reps": number|null,',
      '      "target_weight": number|null,',
      '      "target_duration_mins": number|null,',
      '      "target_distance": number|null,',
      '      "notes": string|null',
      "    }",
      "  ]",
      "}",
      "Use 4-8 exercises.",
      "",
      `Recent history JSON:\n${JSON.stringify(history)}`,
      "",
      `Exercise library JSON:\n${JSON.stringify(library)}`,
    ].join("\n");

    let parsed;
    try {
      parsed = await callGeminiJson({
        prompt,
        temperature: 0.9,
        emptyError: "Gemini returned an empty HIIT response.",
        parseError: "Could not parse HIIT JSON from Gemini.",
      });
    } catch (error) {
      if (/not configured|GEMINI_API_KEY/i.test(error.message)) {
        throw new Error(
          "Training AI is not configured. Add GEMINI_API_KEY to your .env file and restart the server."
        );
      }
      throw error;
    }

    const { plan, skipped } = mapAiExercisesToPlan(library, parsed?.exercises);
    if (plan.length < 3) {
      throw new Error(
        `Could not map enough library exercises for HIIT (got ${plan.length}). Try again.`
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const name = String(parsed?.name || "").trim() || `Daily HIIT ${today}`;
    const notesParts = [
      String(parsed?.notes || "").trim(),
      skipped.length ? `Skipped unknown names: ${skipped.join(", ")}` : "",
    ].filter(Boolean);

    return {
      preview: {
        name,
        notes: notesParts.join("\n"),
        exercises: plan,
      },
      skipped,
    };
  };

  const startAiHiitFromPreview = (athleteId, body, actingUserId) => {
    if (getActiveWorkout(athleteId)) {
      throw new Error(
        "You already have an active workout. Finish or abandon it before starting Daily HIIT."
      );
    }

    const preview = body?.preview || body;
    const plan = Array.isArray(preview?.exercises) ? preview.exercises : [];
    if (plan.length < 3) {
      throw new Error("HIIT preview is incomplete. Generate a WOD first.");
    }

    const today = new Date().toISOString().slice(0, 10);
    const name = String(preview?.name || "").trim() || `Daily HIIT ${today}`;
    const notes = String(preview?.notes || "").trim() || null;

    const started = startWorkout(athleteId, { name, notes }, actingUserId);
    if ((started.exercises || []).length > 0) {
      throw new Error(
        "You already have an active workout. Finish or abandon it before starting Daily HIIT."
      );
    }
    const workout = seedPlanIntoWorkout(started.id, athleteId, plan, actingUserId);
    return { workout };
  };

  const listMeasurements = (athleteId) =>
    all(
      `
        SELECT * FROM ${TRAINING_MEASUREMENTS_TABLE}
        WHERE user_id = ?
        ORDER BY measured_on DESC, id DESC
      `,
      [athleteId]
    );

  const createMeasurement = (athleteId, body, actingUserId) => {
    const measuredOn = String(body?.measured_on || "").trim() || new Date().toISOString().slice(0, 10);
    const result = insertAuditedRow(
      TRAINING_MEASUREMENTS_TABLE,
      {
        user_id: athleteId,
        measured_on: measuredOn,
        body_weight:
          body?.body_weight !== undefined && body?.body_weight !== ""
            ? Number(body.body_weight)
            : null,
        waist: body?.waist !== undefined && body?.waist !== "" ? Number(body.waist) : null,
        chest: body?.chest !== undefined && body?.chest !== "" ? Number(body.chest) : null,
        arms: body?.arms !== undefined && body?.arms !== "" ? Number(body.arms) : null,
        hips: body?.hips !== undefined && body?.hips !== "" ? Number(body.hips) : null,
        thighs: body?.thighs !== undefined && body?.thighs !== "" ? Number(body.thighs) : null,
        notes: String(body?.notes || "").trim() || null,
      },
      actingUserId
    );
    return all(`SELECT * FROM ${TRAINING_MEASUREMENTS_TABLE} WHERE id = ?`, [result.lastID])[0];
  };

  const updateMeasurement = (id, athleteId, body, actingUserId) => {
    const existing = all(
      `SELECT * FROM ${TRAINING_MEASUREMENTS_TABLE} WHERE id = ? AND user_id = ?`,
      [id, athleteId]
    )[0];
    if (!existing) throw new Error("Measurement not found.");
    const num = (key) =>
      body?.[key] !== undefined
        ? body[key] === "" || body[key] === null
          ? null
          : Number(body[key])
        : existing[key];
    updateAuditedRow(
      TRAINING_MEASUREMENTS_TABLE,
      {
        measured_on:
          body?.measured_on !== undefined
            ? String(body.measured_on || "").trim() || existing.measured_on
            : existing.measured_on,
        body_weight: num("body_weight"),
        waist: num("waist"),
        chest: num("chest"),
        arms: num("arms"),
        hips: num("hips"),
        thighs: num("thighs"),
        notes:
          body?.notes !== undefined
            ? String(body.notes || "").trim() || null
            : existing.notes,
      },
      "id = ? AND user_id = ?",
      [id, athleteId],
      actingUserId
    );
    return all(`SELECT * FROM ${TRAINING_MEASUREMENTS_TABLE} WHERE id = ?`, [id])[0];
  };

  const deleteMeasurement = (id, athleteId, actingUserId) => {
    const existing = all(
      `SELECT * FROM ${TRAINING_MEASUREMENTS_TABLE} WHERE id = ? AND user_id = ?`,
      [id, athleteId]
    )[0];
    if (!existing) throw new Error("Measurement not found.");
    archiveAndDeleteRowsInternal(
      TRAINING_MEASUREMENTS_TABLE,
      "id = ? AND user_id = ?",
      [id, athleteId],
      actingUserId
    );
  };

  const listAthletes = () =>
    all(
      `
        SELECT id, username, display_name
        FROM ${USERS_TABLE}
        ORDER BY IFNULL(display_name, username), username
      `
    );

  const handleTrainingApi = async (req, res, getSessionUser) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/api/training" && !url.pathname.startsWith("/api/training/")) {
      return false;
    }

    try {
      const actingUser = getSessionUser(req);
      assertTrainingAccess(actingUser);
      const path = url.pathname;

      if (req.method === "GET" && path === "/api/training/athletes") {
        if (!isSessionAdmin(actingUser)) {
          throw new Error("Admin access required.");
        }
        json(res, 200, { athletes: listAthletes() });
        return true;
      }

      if (req.method === "GET" && path === "/api/training/summary") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, { summary: getSummary(athleteId), athlete_user_id: athleteId });
        return true;
      }

      if (req.method === "GET" && path === "/api/training/exercises") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, {
          exercises: listExercises(athleteId, url.searchParams.get("q") || ""),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/exercises") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, { exercise: createExercise(athleteId, body, actingUser.id) });
        return true;
      }

      const exerciseMatch = path.match(/^\/api\/training\/exercises\/(\d+)$/);
      if (exerciseMatch) {
        const exerciseId = Number(exerciseMatch[1]);
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, {
            exercise: updateExercise(exerciseId, athleteId, body, actingUser.id),
          });
          return true;
        }
        if (req.method === "DELETE") {
          const athleteId = athleteFromQuery(url, actingUser);
          deleteExercise(exerciseId, athleteId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
        if (req.method === "GET" && path.endsWith) {
          /* fallthrough */
        }
      }

      const previousMatch = path.match(/^\/api\/training\/exercises\/(\d+)\/previous$/);
      if (req.method === "GET" && previousMatch) {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, {
          sets: getPreviousExerciseSets(athleteId, Number(previousMatch[1])),
        });
        return true;
      }

      if (req.method === "GET" && path === "/api/training/routines") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, { routines: listRoutines(athleteId), athlete_user_id: athleteId });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/routines") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, { routine: createRoutine(athleteId, body, actingUser.id) });
        return true;
      }

      const routineMatch = path.match(/^\/api\/training\/routines\/(\d+)$/);
      if (routineMatch) {
        const routineId = Number(routineMatch[1]);
        if (req.method === "GET") {
          const athleteId = athleteFromQuery(url, actingUser);
          json(res, 200, { routine: getRoutineOrThrow(routineId, athleteId) });
          return true;
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, {
            routine: updateRoutine(routineId, athleteId, body, actingUser.id),
          });
          return true;
        }
        if (req.method === "DELETE") {
          const athleteId = athleteFromQuery(url, actingUser);
          deleteRoutine(routineId, athleteId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      if (req.method === "GET" && path === "/api/training/workouts/active") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, {
          workout: getActiveWorkout(athleteId),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "GET" && path === "/api/training/workouts") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, {
          workouts: listWorkouts(athleteId, url.searchParams.get("status"), url.searchParams.get("limit")),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/workouts") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, { workout: startWorkout(athleteId, body, actingUser.id) });
        return true;
      }

      const workoutMatch = path.match(/^\/api\/training\/workouts\/(\d+)$/);
      if (workoutMatch) {
        const workoutId = Number(workoutMatch[1]);
        if (req.method === "GET") {
          const athleteId = athleteFromQuery(url, actingUser);
          json(res, 200, { workout: getWorkoutOrThrow(workoutId, athleteId) });
          return true;
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, {
            workout: updateWorkoutMeta(workoutId, athleteId, body, actingUser.id),
          });
          return true;
        }
      }

      const workoutComplete = path.match(/^\/api\/training\/workouts\/(\d+)\/complete$/);
      if (req.method === "POST" && workoutComplete) {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          workout: completeWorkout(Number(workoutComplete[1]), athleteId, body, actingUser.id),
        });
        return true;
      }

      const workoutAbandon = path.match(/^\/api\/training\/workouts\/(\d+)\/abandon$/);
      if (req.method === "POST" && workoutAbandon) {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          workout: abandonWorkout(Number(workoutAbandon[1]), athleteId, actingUser.id),
        });
        return true;
      }

      const weAdd = path.match(/^\/api\/training\/workouts\/(\d+)\/exercises$/);
      if (req.method === "POST" && weAdd) {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          workout: addWorkoutExercise(Number(weAdd[1]), athleteId, body, actingUser.id),
        });
        return true;
      }

      const weMatch = path.match(/^\/api\/training\/workouts\/(\d+)\/exercises\/(\d+)$/);
      if (weMatch) {
        const workoutId = Number(weMatch[1]);
        const weId = Number(weMatch[2]);
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, {
            workout: updateWorkoutExercise(workoutId, athleteId, weId, body, actingUser.id),
          });
          return true;
        }
        if (req.method === "DELETE") {
          const athleteId = athleteFromQuery(url, actingUser);
          json(res, 200, {
            workout: deleteWorkoutExercise(workoutId, athleteId, weId, actingUser.id),
          });
          return true;
        }
      }

      const setAdd = path.match(/^\/api\/training\/workouts\/(\d+)\/exercises\/(\d+)\/sets$/);
      if (req.method === "POST" && setAdd) {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          workout: addSet(Number(setAdd[1]), athleteId, Number(setAdd[2]), body, actingUser.id),
        });
        return true;
      }

      const setMatch = path.match(/^\/api\/training\/sets\/(\d+)$/);
      if (setMatch) {
        const setId = Number(setMatch[1]);
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, { workout: updateSet(setId, athleteId, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          const athleteId = athleteFromQuery(url, actingUser);
          json(res, 200, { workout: deleteSet(setId, athleteId, actingUser.id) });
          return true;
        }
      }

      if (req.method === "GET" && path === "/api/training/progress") {
        const athleteId = athleteFromQuery(url, actingUser);
        const exerciseId = url.searchParams.get("exercise_id");
        json(res, 200, {
          progress: getProgress(athleteId, exerciseId),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "GET" && path === "/api/training/measurements") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, {
          measurements: listMeasurements(athleteId),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/measurements") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          measurement: createMeasurement(athleteId, body, actingUser.id),
        });
        return true;
      }

      const measurementMatch = path.match(/^\/api\/training\/measurements\/(\d+)$/);
      if (measurementMatch) {
        const id = Number(measurementMatch[1]);
        if (req.method === "PUT") {
          const body = await readBody(req);
          const athleteId = athleteFromBody(body, actingUser);
          json(res, 200, {
            measurement: updateMeasurement(id, athleteId, body, actingUser.id),
          });
          return true;
        }
        if (req.method === "DELETE") {
          const athleteId = athleteFromQuery(url, actingUser);
          deleteMeasurement(id, athleteId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      if (req.method === "GET" && path === "/api/training/ai/goals") {
        const athleteId = athleteFromQuery(url, actingUser);
        json(res, 200, { ...getAiGoals(athleteId), athlete_user_id: athleteId });
        return true;
      }

      if (req.method === "PUT" && path === "/api/training/ai/goals") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        json(res, 200, {
          ...saveAiGoals(athleteId, body, actingUser.id),
          athlete_user_id: athleteId,
        });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/ai/routine") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        const result = await generateAiRoutine(athleteId, body, actingUser.id);
        json(res, 200, { ...result, athlete_user_id: athleteId });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/ai/hiit") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        const result = await generateAiHiit(athleteId);
        json(res, 200, { ...result, athlete_user_id: athleteId });
        return true;
      }

      if (req.method === "POST" && path === "/api/training/ai/hiit/start") {
        const body = await readBody(req);
        const athleteId = athleteFromBody(body, actingUser);
        const result = startAiHiitFromPreview(athleteId, body, actingUser.id);
        json(res, 200, { ...result, athlete_user_id: athleteId });
        return true;
      }

      sendApiError(res, req, 404, "Training API route not found.", {
        function_name: "trainingApi",
      });
      return true;
    } catch (trainingError) {
      const statusCode =
        trainingError.message === "Unauthorized."
          ? 401
          : /access|Admin access|only access your own/i.test(trainingError.message)
            ? 403
            : 400;
      sendApiError(res, req, statusCode, trainingError, { function_name: "trainingApi" });
      return true;
    }
  };

  return { ensureTrainingSchema, handleTrainingApi };
}
