/** Shared Match Mischief search / filter helpers. */

export function cardSearchText(card) {
  return [card?.category, card?.idea, card?.question, card?.statement, card?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchMatchCards(cards, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  return cards.filter((card) => cardSearchText(card).includes(q));
}

export function uniqueCategories(cards) {
  const set = new Set();
  for (const card of cards) {
    const value = String(card?.category || "").trim();
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Filter cards for random play using the current user's answers.
 * Each filter is optional; set filters are AND-combined.
 */
export function filterCardsForPlay(cards, answers, filters = {}) {
  const {
    category = "",
    rating_ynm = "",
    rating_heat = "",
    wildest_dream = "",
  } = filters;

  return cards.filter((card) => {
    if (category && String(card.category || "").trim() !== category) {
      return false;
    }

    const answer = answers?.[card.id];
    const needsAnswer = Boolean(rating_ynm || rating_heat || wildest_dream);
    if (needsAnswer && !answer) return false;

    if (rating_ynm) {
      if (!answer?.rating_ynm || answer.rating_ynm !== rating_ynm) return false;
    }

    if (rating_heat !== "" && rating_heat != null) {
      if (answer?.rating_heat == null || Number(answer.rating_heat) !== Number(rating_heat)) {
        return false;
      }
    }

    if (wildest_dream === "yes") {
      if (!answer?.wildest_dream) return false;
    } else if (wildest_dream === "no") {
      if (answer?.wildest_dream) return false;
      // Require an answer so unanswered cards don't all count as "not wildest".
      if (!answer) return false;
    }

    return true;
  });
}

export function pickRandomCard(cards, { excludeId = null } = {}) {
  if (!cards?.length) return null;
  const pool = excludeId == null ? cards : cards.filter((card) => card.id !== excludeId);
  const list = pool.length ? pool : cards;
  return list[Math.floor(Math.random() * list.length)];
}
