import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HEAT_LEVELS,
  YNM_OPTIONS,
  createMatchCard,
  deleteMatchCard,
  getMatchPlayState,
  importMatchCards,
  readFileAsDataUrl,
  resetMatchAnswers,
  saveMatchAnswer,
  updateMatchCard,
  deleteMatchCardImage,
  uploadMatchCardImage,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/ui/Modal";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import MatchCardImage from "./MatchCardImage";
import { searchMatchCards } from "./matchPlayUtils";

function emptyAnswer() {
  return {
    rating_ynm: "",
    rating_heat: "",
    wildest_dream: false,
    notes: "",
  };
}

function answerFromMap(map, cardId) {
  const row = map?.[cardId];
  if (!row) return emptyAnswer();
  return {
    rating_ynm: row.rating_ynm || "",
    rating_heat: row.rating_heat == null ? "" : String(row.rating_heat),
    wildest_dream: Boolean(row.wildest_dream),
    notes: row.notes || "",
  };
}

function cardEditFromCard(card) {
  return {
    category: card?.category || "",
    idea: card?.idea || "",
    question: card?.question || "",
    statement: card?.statement || "",
    description: card?.description || "",
  };
}

const SFW_STORAGE_KEY = "troublehub-match-sfw";

function readSfwPreference() {
  try {
    return localStorage.getItem(SFW_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function MatchMischiefPage() {
  const { confirm, confirmModal } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [answers, setAnswers] = useState({});
  const [progress, setProgress] = useState({ total: 0, answered: 0, remaining: 0 });
  const [canManage, setCanManage] = useState(false);
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState(emptyAnswer());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [sfwMode, setSfwMode] = useState(() => readSfwPreference());
  const [cardSearch, setCardSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    category: "",
    idea: "",
    question: "",
    statement: "",
    description: "",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importReplace, setImportReplace] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(cardEditFromCard(null));
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [pendingImageUrl, setPendingImageUrl] = useState(null);
  const [removeImageOnSave, setRemoveImageOnSave] = useState(false);
  const initialJumpDone = useRef(false);
  const cardsRef = useRef([]);
  const indexRef = useRef(0);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const clearImageDraft = useCallback(() => {
    setPendingImageFile(null);
    setPendingImageUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRemoveImageOnSave(false);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditing(false);
    clearImageDraft();
  }, [clearImageDraft]);

  const load = useCallback(async ({ jumpToUnanswered = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const payload = await getMatchPlayState();
      const nextCards = payload.cards || [];
      const previousId = cardsRef.current[indexRef.current]?.id;
      setCards(nextCards);
      setAnswers(payload.answers || {});
      setProgress(payload.progress || { total: 0, answered: 0, remaining: 0 });
      setCanManage(Boolean(payload.can_manage));
      setIndex((current) => {
        if (nextCards.length === 0) return 0;
        if (jumpToUnanswered) {
          const firstUnanswered = nextCards.findIndex((entry) => !payload.answers?.[entry.id]);
          if (firstUnanswered >= 0) return firstUnanswered;
        }
        if (previousId != null) {
          const stillThere = nextCards.findIndex((entry) => entry.id === previousId);
          if (stillThere >= 0) return stillThere;
        }
        return Math.min(current, nextCards.length - 1);
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load Match Mischief.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialJumpDone.current) return;
    initialJumpDone.current = true;
    load({ jumpToUnanswered: true });
  }, [load]);

  // Deep-link: /match?card=123
  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (!cardParam || cards.length === 0) return;
    const cardId = Number(cardParam);
    if (!Number.isInteger(cardId)) return;
    const found = cards.findIndex((entry) => entry.id === cardId);
    if (found >= 0) {
      setIndex(found);
      setSearchParams({}, { replace: true });
    }
  }, [cards, searchParams, setSearchParams]);

  const searchHits = useMemo(() => searchMatchCards(cards, cardSearch).slice(0, 12), [cards, cardSearch]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onPointerDown = (event) => {
      if (!searchWrapRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  const jumpToCard = (cardId) => {
    const found = cards.findIndex((entry) => entry.id === cardId);
    if (found < 0) return;
    if (editing) exitEditMode();
    setIndex(found);
    setCardSearch("");
    setSearchOpen(false);
    setStatus(`Jumped to card ${found + 1}.`);
  };

  const card = cards[index] || null;

  useEffect(() => {
    if (!card) {
      setForm(emptyAnswer());
      return;
    }
    if (editing) return;
    setForm(answerFromMap(answers, card.id));
  }, [card, answers, editing]);

  useEffect(() => {
    // Leaving the current card cancels edit mode.
    exitEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  const heatLabel = useMemo(() => {
    const level = HEAT_LEVELS.find((entry) => String(entry.value) === String(form.rating_heat));
    return level ? `${level.icon} ${level.label}` : "";
  }, [form.rating_heat]);

  const beginEdit = () => {
    if (!card || !canManage) return;
    setEditForm(cardEditFromCard(card));
    clearImageDraft();
    setEditing(true);
    setError("");
    setStatus("Card edit locked — save updates the card, not your answer.");
  };

  const handleSaveAnswer = async ({ advance = false } = {}) => {
    if (!card || editing) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const payload = {
        rating_ynm: form.rating_ynm || null,
        rating_heat: form.rating_heat === "" ? null : Number(form.rating_heat),
        wildest_dream: form.wildest_dream,
        notes: form.notes,
      };
      const result = await saveMatchAnswer(card.id, payload);
      setAnswers((prev) => ({ ...prev, [card.id]: result.answer }));
      setStatus("Saved.");
      if (advance === "back") {
        if (index > 0) {
          setIndex((value) => value - 1);
        } else {
          setStatus("Saved — you’re on the first card.");
        }
      } else if (advance && index < cards.length - 1) {
        setIndex((value) => value + 1);
      } else if (advance) {
        setStatus("Saved — you’ve reached the last card. You can still go back and edit.");
      }
      const answered = Object.keys({ ...answers, [card.id]: result.answer }).length;
      setProgress({
        total: cards.length,
        answered: Math.min(cards.length, answered),
        remaining: Math.max(0, cards.length - answered),
      });
    } catch (saveError) {
      setError(saveError.message || "Could not save answer.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    if (!card || !editing) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const result = await updateMatchCard(card.id, editForm);
      let nextCard = result.card;

      if (removeImageOnSave && card.has_image && !pendingImageFile) {
        const cleared = await deleteMatchCardImage(card.id);
        nextCard = cleared.card || { ...nextCard, has_image: false, image_path: null };
      }

      if (pendingImageFile) {
        const dataUrl = await readFileAsDataUrl(pendingImageFile);
        const uploaded = await uploadMatchCardImage(card.id, {
          fileBase64: dataUrl,
          mimeType: pendingImageFile.type || "image/png",
        });
        nextCard = uploaded.card || nextCard;
      }

      setCards((prev) => prev.map((entry) => (entry.id === card.id ? { ...entry, ...nextCard } : entry)));
      clearImageDraft();
      setEditing(false);
      setStatus("Card saved.");
    } catch (saveError) {
      setError(saveError.message || "Could not save card.");
    } finally {
      setSaving(false);
    }
  };

  const handleDraftImage = (file) => {
    if (!file || !editing) return;
    setPendingImageUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPendingImageFile(file);
    setRemoveImageOnSave(false);
  };

  const handleDraftImageRemove = () => {
    if (!editing) return;
    setPendingImageFile(null);
    setPendingImageUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRemoveImageOnSave(true);
  };

  const handleCreateCustom = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createMatchCard(customForm);
      setCustomOpen(false);
      setCustomForm({
        category: "",
        idea: "",
        question: "",
        statement: "",
        description: "",
      });
      setStatus("Custom card added. Other players were notified.");
      await load({ jumpToUnanswered: false });
    } catch (createError) {
      setError(createError.message || "Could not create card.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const parsed = JSON.parse(importText);
      const cardsPayload = Array.isArray(parsed) ? parsed : parsed.cards;
      const result = await importMatchCards(cardsPayload, { replace: importReplace });
      setImportOpen(false);
      setStatus(`Imported ${result.inserted} card(s).`);
      await load({ jumpToUnanswered: true });
    } catch (importError) {
      setError(importError.message || "Import failed. Provide a JSON array of cards.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset all Match Mischief answers?",
      message: "Every player’s ratings, wildest dreams, and notes will be wiped. Cards stay.",
      confirmLabel: "Reset answers",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await resetMatchAnswers();
      setStatus("All answers cleared.");
      await load({ jumpToUnanswered: true });
    } catch (resetError) {
      setError(resetError.message || "Could not reset.");
    } finally {
      setSaving(false);
    }
  };

  const playLocked = editing;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Match Mischief" },
        ]}
        title="Match Mischief"
        subtitle="One card at a time. Rate it, dream wild, leave a note, then continue."
        actions={
          <>
            <button
              type="button"
              className={`button th-sfw-toggle${sfwMode ? " is-on" : ""}`}
              aria-pressed={sfwMode}
              title={sfwMode ? "SFW on — images blurred" : "SFW off — images visible"}
              onClick={() => {
                setSfwMode((current) => {
                  const next = !current;
                  try {
                    localStorage.setItem(SFW_STORAGE_KEY, next ? "1" : "0");
                  } catch {
                    // ignore
                  }
                  return next;
                });
              }}
            >
              SFW {sfwMode ? "On" : "Off"}
            </button>
            <button type="button" className="button" onClick={() => setCustomOpen(true)} disabled={editing}>
              Add custom card
            </button>
            <Link className="button" to="/app/troublehub/match/play">
              Try a card
            </Link>
            <Link className="button" to="/app/troublehub/match/compare">
              Compare
            </Link>
            {canManage ? (
              <>
                <button type="button" className="button" onClick={() => setImportOpen(true)} disabled={editing}>
                  Import cards
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleReset}
                  disabled={saving || editing}
                >
                  Reset answers
                </button>
              </>
            ) : null}
          </>
        }
      />

      {error ? <p className="error">{error}</p> : null}
      {status ? <p className="status">{status}</p> : null}

      {loading ? (
        <section className="panel">
          <p className="subtext">Loading the deck…</p>
        </section>
      ) : cards.length === 0 ? (
        <section className="panel empty-state">
          <p className="subtext">No cards yet. Import a baseline deck or add a custom card.</p>
        </section>
      ) : (
        <section className={`panel th-match-stage${editing ? " is-editing" : ""}`}>
          <div className="th-match-progress">
            <span>
              Card {index + 1} of {cards.length}
            </span>
            <span className="stat-meta">
              {progress.answered} answered · {progress.remaining} remaining
            </span>
            <div className="th-match-search" ref={searchWrapRef}>
              <label className="th-match-search-label">
                <span className="visually-hidden">Search cards</span>
                <input
                  type="search"
                  value={cardSearch}
                  disabled={editing}
                  placeholder="Search cards…"
                  onChange={(event) => {
                    setCardSearch(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchHits[0]) {
                      event.preventDefault();
                      jumpToCard(searchHits[0].id);
                    } else if (event.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />
              </label>
              {searchOpen && cardSearch.trim() ? (
                <ul className="th-match-search-results" role="listbox">
                  {searchHits.length === 0 ? (
                    <li className="th-match-search-empty">No matches</li>
                  ) : (
                    searchHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className="th-match-search-hit"
                          onClick={() => jumpToCard(hit.id)}
                        >
                          <strong>{hit.idea || hit.question || hit.statement || "Card"}</strong>
                          {hit.category ? <span className="stat-meta">{hit.category}</span> : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          </div>

          {editing ? (
            <p className="th-match-edit-banner" role="status">
              Editing card — answers and navigation are locked. Save updates the card only.
            </p>
          ) : null}

          {card ? (
            <div className="th-match-shell">
              <button
                type="button"
                className="th-match-cycle th-match-cycle--prev"
                disabled={index <= 0 || saving || playLocked}
                onClick={() => handleSaveAnswer({ advance: "back" })}
                aria-label="Save and go to previous card"
                title={playLocked ? "Finish editing first" : "Save & previous"}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <article className="th-match-card">
                <div className="th-ynm-row" role="group" aria-label="Yes, No, or Maybe">
                  {YNM_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`th-ynm-btn${form.rating_ynm === option.value ? " is-on" : ""}`}
                      disabled={playLocked}
                      onClick={() => setForm((prev) => ({ ...prev, rating_ynm: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="th-match-main">
                  <div className="th-match-media-copy">
                    {editing ? (
                      <div className="th-match-card-body th-match-card-edit">
                        <label>
                          Category
                          <input
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, category: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Idea
                          <input
                            value={editForm.idea}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, idea: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Question
                          <input
                            value={editForm.question}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, question: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Statement
                          <input
                            value={editForm.statement}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, statement: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            rows={4}
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="th-match-card-body">
                        {card.category ? <p className="th-match-category">{card.category}</p> : null}
                        {card.idea ? <h2 className="th-match-idea">{card.idea}</h2> : null}
                        {card.question ? <p className="th-match-question">{card.question}</p> : null}
                        {card.statement ? <p className="th-match-statement">{card.statement}</p> : null}
                        {card.description ? (
                          <p className="th-match-description">{card.description}</p>
                        ) : null}
                        {card.is_custom ? <p className="th-match-custom-badge">Custom card</p> : null}
                      </div>
                    )}
                    <MatchCardImage
                      card={card}
                      canUpload={editing && canManage}
                      uploading={saving}
                      sfwBlur={sfwMode && !editing}
                      draftPreviewUrl={pendingImageUrl}
                      forceEmpty={removeImageOnSave && !pendingImageUrl}
                      onUploadFile={handleDraftImage}
                      onRemove={handleDraftImageRemove}
                    />
                  </div>

                  <aside className="th-heat-rail" aria-label="Heat rating">
                    <div className="th-heat-rail-top" aria-hidden="true">
                      🌋
                    </div>
                    <input
                      type="range"
                      className="th-heat-slider"
                      min={1}
                      max={5}
                      step={1}
                      disabled={playLocked}
                      value={form.rating_heat === "" ? 3 : Number(form.rating_heat)}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, rating_heat: event.target.value }))
                      }
                      aria-valuetext={heatLabel || "Warming Up"}
                      aria-label="Heat index"
                      list="th-heat-ticks"
                    />
                    <datalist id="th-heat-ticks">
                      {HEAT_LEVELS.map((level) => (
                        <option key={level.value} value={level.value} label={level.label} />
                      ))}
                    </datalist>
                    <div className="th-heat-rail-bottom" aria-hidden="true">
                      🧊
                    </div>
                    <p className="th-heat-current">{heatLabel || "Slide for heat"}</p>
                  </aside>
                </div>

                <button
                  type="button"
                  className={`th-wildest-toggle${form.wildest_dream ? " is-on" : ""}`}
                  disabled={playLocked}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, wildest_dream: !prev.wildest_dream }))
                  }
                  aria-pressed={form.wildest_dream}
                >
                  <span className="th-wildest-icon" aria-hidden="true">
                    ☄️
                  </span>
                  <span>
                    <strong>In My Wildest Dreams</strong>
                  </span>
                </button>

                <label className="th-notes-field">
                  Notes
                  <textarea
                    rows={3}
                    value={form.notes}
                    disabled={playLocked}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Private notes for this card…"
                  />
                </label>

                {editing ? (
                  <div className="th-match-nav">
                    <button
                      type="button"
                      className="button"
                      disabled={saving}
                      onClick={() => {
                        exitEditMode();
                        setStatus("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={saving}
                      onClick={handleSaveCard}
                    >
                      Save card
                    </button>
                  </div>
                ) : (
                  <div className="th-match-nav">
                    <button
                      type="button"
                      className="button"
                      disabled={saving}
                      onClick={() => handleSaveAnswer({ advance: false })}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={saving}
                      onClick={() => handleSaveAnswer({ advance: true })}
                    >
                      {index >= cards.length - 1 ? "Save" : "Save & continue"}
                    </button>
                  </div>
                )}

                {canManage ? (
                  <div className="th-match-admin-row">
                    {!editing ? (
                      <button type="button" className="button" onClick={beginEdit} disabled={saving}>
                        Edit card
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger-button"
                      disabled={saving || editing}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete this card?",
                          message: "Answers for this card will be removed too.",
                          confirmLabel: "Delete card",
                        });
                        if (!ok) return;
                        await deleteMatchCard(card.id);
                        exitEditMode();
                        await load({ jumpToUnanswered: false });
                      }}
                    >
                      Delete card
                    </button>
                  </div>
                ) : null}
              </article>

              <button
                type="button"
                className="th-match-cycle th-match-cycle--next"
                disabled={index >= cards.length - 1 || saving || playLocked}
                onClick={() => handleSaveAnswer({ advance: true })}
                aria-label="Save and go to next card"
                title={playLocked ? "Finish editing first" : "Save & next"}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : null}
        </section>
      )}

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add custom card"
        description="Other TroubleHub players get a notification with a link to play."
        footer={
          <>
            <button type="button" className="button" onClick={() => setCustomOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="th-custom-card-form" className="button-primary" disabled={saving}>
              Add card
            </button>
          </>
        }
      >
        <form id="th-custom-card-form" className="form" onSubmit={handleCreateCustom}>
          <label>
            Category
            <input
              value={customForm.category}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, category: e.target.value }))}
            />
          </label>
          <label>
            Idea
            <input
              value={customForm.idea}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, idea: e.target.value }))}
            />
          </label>
          <label>
            Question
            <input
              value={customForm.question}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, question: e.target.value }))}
            />
          </label>
          <label>
            Statement
            <input
              value={customForm.statement}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, statement: e.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={customForm.description}
              onChange={(e) =>
                setCustomForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import baseline cards"
        description="Paste a JSON array of cards (category, idea, question, statement, description, sort_order)."
        size="lg"
        footer={
          <>
            <button type="button" className="button" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="th-import-form" className="button-primary" disabled={saving}>
              Import
            </button>
          </>
        }
      >
        <form id="th-import-form" className="form" onSubmit={handleImport}>
          <label className="calendar-checkbox-row">
            <input
              type="checkbox"
              checked={importReplace}
              onChange={(e) => setImportReplace(e.target.checked)}
            />
            Replace existing cards and answers
          </label>
          <label>
            JSON
            <textarea
              rows={14}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              spellCheck={false}
              required
            />
          </label>
        </form>
      </Modal>

      {confirmModal}
    </>
  );
}

export default MatchMischiefPage;
