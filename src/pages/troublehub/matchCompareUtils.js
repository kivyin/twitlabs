import { HEAT_LEVELS } from "../../api/troublehubApi";

export function formatYnm(value) {
  if (!value) return "—";
  const label = String(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatHeat(value) {
  if (value == null || value === "") return "—";
  const level = HEAT_LEVELS.find((entry) => entry.value === Number(value));
  if (!level) return String(value);
  return `${level.icon} ${level.value}`;
}

function hasYnm(answer) {
  return Boolean(answer?.rating_ynm);
}

function hasHeat(answer) {
  return answer?.rating_heat != null && answer.rating_heat !== "";
}

/** True when the player left a real rating (Y/N/M and/or heat). */
export function hasAnswered(answer) {
  return hasYnm(answer) || hasHeat(answer);
}

/**
 * Yes/No/Maybe alignment for act-on decisions.
 * Exact match is full credit; soft pairs (yes↔maybe) get partial; yes↔no gets none.
 */
export function scoreYnmMatch(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const pair = new Set([a, b]);
  if (pair.has("yes") && pair.has("maybe")) return 0.5;
  if (pair.has("no") && pair.has("maybe")) return 0.25;
  return 0; // yes ↔ no
}

/**
 * Heat closeness on the 1–5 scale (missing / 0 treated as unanswered elsewhere).
 * Same value = full credit; 1 apart = close; 2 apart = weak; 3+ = none.
 */
export function scoreHeatMatch(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  const delta = Math.abs(left - right);
  if (delta === 0) return 1;
  if (delta === 1) return 0.75;
  if (delta === 2) return 0.25;
  return 0;
}

/**
 * 0–100 alignment score from Yes/No/Maybe + heat only.
 * Wildest dreams are intentionally excluded — use filters/sort to find fantasies to act on.
 * Null / empty / missing answers are not treated as matches.
 */
export function computeMatchPercent(row) {
  const mine = row?.mine;
  const theirs = row?.theirs;

  if (!hasAnswered(mine) || !hasAnswered(theirs)) return 0;

  const parts = [];

  if (hasYnm(mine) && hasYnm(theirs)) {
    parts.push(scoreYnmMatch(mine.rating_ynm, theirs.rating_ynm));
  } else if (hasYnm(mine) || hasYnm(theirs)) {
    parts.push(0);
  }

  if (hasHeat(mine) && hasHeat(theirs)) {
    parts.push(scoreHeatMatch(mine.rating_heat, theirs.rating_heat));
  } else if (hasHeat(mine) || hasHeat(theirs)) {
    parts.push(0);
  }

  if (parts.length === 0) return 0;
  return Math.round((parts.reduce((sum, value) => sum + value, 0) / parts.length) * 100);
}

export function matchGradientStyle(percent) {
  const strength = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
  // Hot pink → white; stronger match = more pink coverage / opacity.
  const pinkAlpha = 0.12 + strength * 0.72;
  const midStop = Math.round(28 + strength * 52);
  return {
    background: `linear-gradient(90deg, rgba(255, 105, 180, ${pinkAlpha}) 0%, rgba(255, 255, 255, ${
      0.55 + (1 - strength) * 0.35
    }) ${midStop}%, rgba(255, 255, 255, 0.92) 100%)`,
  };
}

export const COMPARE_SORT_OPTIONS = [
  { value: "match_desc", label: "Match % (high → low)" },
  { value: "match_asc", label: "Match % (low → high)" },
  { value: "my_ynm", label: "My Yes / No / Maybe" },
  { value: "their_ynm", label: "Their Yes / No / Maybe" },
  { value: "my_heat_desc", label: "My heat (hot → cold)" },
  { value: "their_heat_desc", label: "Their heat (hot → cold)" },
  { value: "wildest_both", label: "Wildest dreams (both)" },
  { value: "wildest_mine", label: "My wildest dreams" },
  { value: "wildest_theirs", label: "Their wildest dreams" },
  { value: "idea", label: "Idea A–Z" },
];

export const COMPARE_FILTER_OPTIONS = [
  { value: "all", label: "All cards" },
  { value: "both_answered", label: "Both answered" },
  { value: "unanswered_either", label: "Missing an answer" },
  { value: "my_yes", label: "My Yes" },
  { value: "my_maybe", label: "My Maybe" },
  { value: "my_no", label: "My No" },
  { value: "their_yes", label: "Their Yes" },
  { value: "their_maybe", label: "Their Maybe" },
  { value: "their_no", label: "Their No" },
  { value: "my_heat_1", label: "My heat 1" },
  { value: "my_heat_2", label: "My heat 2" },
  { value: "my_heat_3", label: "My heat 3" },
  { value: "my_heat_4", label: "My heat 4" },
  { value: "my_heat_5", label: "My heat 5" },
  { value: "their_heat_1", label: "Their heat 1" },
  { value: "their_heat_2", label: "Their heat 2" },
  { value: "their_heat_3", label: "Their heat 3" },
  { value: "their_heat_4", label: "Their heat 4" },
  { value: "their_heat_5", label: "Their heat 5" },
  { value: "wildest_both", label: "Wildest dreams (both)" },
  { value: "wildest_mine", label: "My wildest dreams" },
  { value: "wildest_theirs", label: "Their wildest dreams" },
  { value: "both_yes", label: "Both Yes (act-on)" },
  { value: "both_yes_wildest", label: "Both Yes + both wildest" },
  { value: "match_100", label: "Perfect match (100%)" },
  { value: "match_partial", label: "Partial match (1–99%)" },
  { value: "match_0", label: "No match (0%)" },
];

const YNM_ORDER = { yes: 0, maybe: 1, no: 2 };

function ynmRank(value) {
  if (!value) return 99;
  return YNM_ORDER[value] ?? 50;
}

export function sortComparisonRows(rows, sortKey) {
  const list = [...rows];
  const byIdea = (a, b) =>
    String(a.card?.idea || a.card?.question || "").localeCompare(
      String(b.card?.idea || b.card?.question || ""),
      undefined,
      { sensitivity: "base" }
    );

  list.sort((a, b) => {
    switch (sortKey) {
      case "match_asc":
        return (a.matchPercent || 0) - (b.matchPercent || 0) || byIdea(a, b);
      case "my_ynm":
        return ynmRank(a.mine?.rating_ynm) - ynmRank(b.mine?.rating_ynm) || byIdea(a, b);
      case "their_ynm":
        return ynmRank(a.theirs?.rating_ynm) - ynmRank(b.theirs?.rating_ynm) || byIdea(a, b);
      case "my_heat_desc":
        return (Number(b.mine?.rating_heat) || 0) - (Number(a.mine?.rating_heat) || 0) || byIdea(a, b);
      case "their_heat_desc":
        return (
          (Number(b.theirs?.rating_heat) || 0) - (Number(a.theirs?.rating_heat) || 0) || byIdea(a, b)
        );
      case "wildest_both": {
        const aBoth = a.mine?.wildest_dream && a.theirs?.wildest_dream ? 1 : 0;
        const bBoth = b.mine?.wildest_dream && b.theirs?.wildest_dream ? 1 : 0;
        return bBoth - aBoth || (b.matchPercent || 0) - (a.matchPercent || 0);
      }
      case "wildest_mine":
        return (
          Number(Boolean(b.mine?.wildest_dream)) - Number(Boolean(a.mine?.wildest_dream)) ||
          byIdea(a, b)
        );
      case "wildest_theirs":
        return (
          Number(Boolean(b.theirs?.wildest_dream)) - Number(Boolean(a.theirs?.wildest_dream)) ||
          byIdea(a, b)
        );
      case "idea":
        return byIdea(a, b);
      case "match_desc":
      default:
        return (b.matchPercent || 0) - (a.matchPercent || 0) || byIdea(a, b);
    }
  });
  return list;
}

export function filterComparisonRows(rows, filterKey) {
  if (!filterKey || filterKey === "all") return rows;

  return rows.filter((row) => {
    const mine = row.mine;
    const theirs = row.theirs;
    const pct = row.matchPercent || 0;

    switch (filterKey) {
      case "both_answered":
        return hasAnswered(mine) && hasAnswered(theirs);
      case "unanswered_either":
        return !hasAnswered(mine) || !hasAnswered(theirs);
      case "my_yes":
        return mine?.rating_ynm === "yes";
      case "my_maybe":
        return mine?.rating_ynm === "maybe";
      case "my_no":
        return mine?.rating_ynm === "no";
      case "their_yes":
        return theirs?.rating_ynm === "yes";
      case "their_maybe":
        return theirs?.rating_ynm === "maybe";
      case "their_no":
        return theirs?.rating_ynm === "no";
      case "my_heat_1":
      case "my_heat_2":
      case "my_heat_3":
      case "my_heat_4":
      case "my_heat_5":
        return Number(mine?.rating_heat) === Number(filterKey.slice(-1));
      case "their_heat_1":
      case "their_heat_2":
      case "their_heat_3":
      case "their_heat_4":
      case "their_heat_5":
        return Number(theirs?.rating_heat) === Number(filterKey.slice(-1));
      case "wildest_both":
        return Boolean(mine?.wildest_dream) && Boolean(theirs?.wildest_dream);
      case "wildest_mine":
        return Boolean(mine?.wildest_dream);
      case "wildest_theirs":
        return Boolean(theirs?.wildest_dream);
      case "both_yes":
        return mine?.rating_ynm === "yes" && theirs?.rating_ynm === "yes";
      case "both_yes_wildest":
        return (
          mine?.rating_ynm === "yes" &&
          theirs?.rating_ynm === "yes" &&
          Boolean(mine?.wildest_dream) &&
          Boolean(theirs?.wildest_dream)
        );
      case "match_100":
        return pct === 100;
      case "match_partial":
        return pct > 0 && pct < 100;
      case "match_0":
        return pct === 0;
      default:
        return true;
    }
  });
}
