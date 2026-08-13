import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FANTASY_AUDIENCES,
  FANTASY_CATEGORIES,
  clearFantasyCards,
  createFantasyCard,
  deleteFantasyCard,
  importFantasyCards,
  importFantasyCardsCsv,
  listFantasyCards,
  updateFantasyCard,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/ui/Modal";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { readTextFileWithEncoding } from "../../utils/readTextFile";

function categoryLabel(value) {
  return FANTASY_CATEGORIES.find((entry) => entry.value === value)?.label || value;
}

const emptyForm = {
  audience: "male",
  category: "romantic",
  title: "",
  description: "",
};

function FantasiesDeckPage() {
  const { confirm, confirmModal } = useConfirmDialog();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState("csv");
  const [importText, setImportText] = useState("");
  const [importReplace, setImportReplace] = useState(true);

  const categoryOrder = useMemo(
    () => Object.fromEntries(FANTASY_CATEGORIES.map((entry, index) => [entry.value, index])),
    []
  );

  const loadCards = useCallback(async () => {
    const payload = await listFantasyCards();
    setCards(payload?.cards || []);
    return payload;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadCards();
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Could not load fantasy cards.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCards]);

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (audienceFilter !== "all" && card.audience !== audienceFilter) return false;
        if (categoryFilter !== "all" && card.category !== categoryFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const catDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
        if (catDiff !== 0) return catDiff;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  }, [cards, audienceFilter, categoryFilter, categoryOrder]);

  const runAction = async (fn, successMessage = "") => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await fn();
      await loadCards();
      if (successMessage) setStatus(successMessage);
    } catch (actionError) {
      setError(actionError.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (card) => {
    setEditingId(card.id);
    setForm({
      audience: card.audience || "male",
      category: card.category || "romantic",
      title: card.title || "",
      description: card.description || "",
    });
    setEditorOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    await runAction(async () => {
      if (editingId) {
        await updateFantasyCard(editingId, form);
      } else {
        await createFantasyCard(form);
      }
      setEditorOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    }, editingId ? "Card updated." : "Card created.");
  };

  const handleImport = async (event) => {
    event.preventDefault();
    await runAction(async () => {
      let result;
      if (importMode === "csv") {
        result = await importFantasyCardsCsv(importText, { replace: importReplace });
      } else {
        const parsed = JSON.parse(importText);
        const nextCards = Array.isArray(parsed) ? parsed : parsed.cards;
        result = await importFantasyCards(nextCards, { replace: importReplace });
      }
      setImportOpen(false);
      setImportText("");
      setStatus(
        `Imported ${result.inserted} fantasy card(s)${
          result.skipped_empty_title
            ? ` (skipped ${result.skipped_empty_title} row(s) with empty title)`
            : ""
        }.`
      );
    });
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setError(
        "Upload a .csv file. In Excel: File → Save As → CSV UTF-8 (.csv), then choose that file."
      );
      return;
    }
    const text = await readTextFileWithEncoding(file);
    const mode = name.endsWith(".json") ? "json" : "csv";
    setImportMode(mode);
    setImportText(text);
    setImportReplace(true);
    await runAction(async () => {
      let result;
      if (mode === "csv") {
        result = await importFantasyCardsCsv(text, { replace: true });
      } else {
        const parsed = JSON.parse(text);
        const nextCards = Array.isArray(parsed) ? parsed : parsed.cards;
        result = await importFantasyCards(nextCards, { replace: true });
      }
      setStatus(
        `Imported ${result.inserted} fantasy card(s) from ${file.name}${
          result.skipped_empty_title
            ? ` (skipped ${result.skipped_empty_title} row(s) with empty title)`
            : ""
        }.`
      );
    });
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Fantasies", to: "/app/troublehub/fantasies" },
          { label: "Deck" },
        ]}
        title="Fantasy deck"
        subtitle={`${cards.length} card${cards.length === 1 ? "" : "s"} in the shared deck.`}
        actions={
          <>
            <Link to="/app/troublehub/fantasies" className="button">
              Back
            </Link>
            <label className="button-primary" style={{ cursor: busy ? "default" : "pointer" }}>
              Upload Excel CSV
              <input
                type="file"
                accept=".csv,.txt,.json,text/csv,application/json"
                hidden
                disabled={busy}
                onChange={handleImportFile}
              />
            </label>
            <button
              type="button"
              className="button"
              onClick={() => {
                setImportMode("csv");
                setImportOpen(true);
              }}
              disabled={busy}
            >
              Paste import
            </button>
            <button type="button" className="button" onClick={openCreate} disabled={busy}>
              Add card
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={busy || cards.length === 0}
              onClick={async () => {
                const ok = await confirm({
                  title: "Clear fantasy deck?",
                  message: "Deletes every fantasy card from the deck. Sessions/picks are left alone.",
                  confirmLabel: "Clear deck",
                });
                if (!ok) return;
                await runAction(() => clearFantasyCards(), "Fantasy deck cleared.");
              }}
            >
              Clear deck
            </button>
          </>
        }
      />

      <div className="th-fantasy-game-page">
      {error ? <p className="error">{error}</p> : null}
      {status ? <p className="status">{status}</p> : null}

      <section className="panel th-fantasy-setup">
        <div className="th-fantasy-filters">
          <label>
            Audience
            <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}>
              <option value="all">All</option>
              {FANTASY_AUDIENCES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All</option>
              {FANTASY_CATEGORIES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="subtext">Loading deck…</p>
        ) : filteredCards.length === 0 ? (
          <p className="subtext">
            No fantasy cards yet. Upload an Excel CSV, paste an import, or add a card.
          </p>
        ) : (
          <ul className="th-fantasy-card-list">
            {filteredCards.map((card) => {
              const audienceClass =
                card.audience === "male"
                  ? " is-male"
                  : card.audience === "female"
                    ? " is-female"
                    : "";
              return (
                <li key={card.id}>
                  <div className={`th-fantasy-card${audienceClass}`}>
                    <div className="th-fantasy-card-meta">
                      <span className={`th-fantasy-pill is-${card.category}`}>
                        {categoryLabel(card.category)}
                      </span>
                      <span className="th-fantasy-pill">
                        {card.audience === "male" ? "Male" : "Female"}
                      </span>
                      {card.is_custom ? <span className="th-fantasy-pill">Custom</span> : null}
                    </div>
                    <strong>{card.title}</strong>
                    {card.description ? <p>{card.description}</p> : null}
                    <div className="th-fantasy-game-card-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={busy}
                        onClick={() => openEdit(card)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete this card?",
                            message: card.title,
                            confirmLabel: "Delete",
                          });
                          if (!ok) return;
                          await runAction(() => deleteFantasyCard(card.id), "Card deleted.");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? "Edit fantasy card" : "Add fantasy card"}
        description="Every card needs a title. Pick Male/Female and a category."
        footer={
          <>
            <button type="button" className="button" onClick={() => setEditorOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="th-fantasy-deck-form"
              className="button-primary"
              disabled={busy || !form.title.trim()}
            >
              {editingId ? "Save changes" : "Add card"}
            </button>
          </>
        }
      >
        <form id="th-fantasy-deck-form" className="form" onSubmit={handleSave}>
          <label>
            Audience
            <select
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
            >
              {FANTASY_AUDIENCES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {FANTASY_CATEGORIES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
              maxLength={160}
              placeholder="Short fantasy title"
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              maxLength={1000}
              placeholder="Optional details"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import fantasy cards"
        description="Excel CSV on Windows is supported (encoding auto-detected). Columns: audience, category, title, task/description."
        size="lg"
        footer={
          <>
            <button type="button" className="button" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="th-fantasy-import-form"
              className="button-primary"
              disabled={busy || !importText.trim()}
            >
              Import
            </button>
          </>
        }
      >
        <form id="th-fantasy-import-form" className="form" onSubmit={handleImport}>
          <label className="calendar-checkbox-row">
            <input
              type="checkbox"
              checked={importReplace}
              onChange={(e) => setImportReplace(e.target.checked)}
            />
            Replace existing fantasy cards
          </label>
          <label>
            Format
            <select value={importMode} onChange={(e) => setImportMode(e.target.value)}>
              <option value="csv">CSV (from Excel)</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <label>
            {importMode === "csv" ? "CSV text" : "JSON"}
            <textarea
              rows={14}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              spellCheck={false}
              required
              placeholder={
                importMode === "csv"
                  ? "audience,category,title,description\nmale,romantic,Slow dance,...\n"
                  : '[\n  {"audience":"male","category":"romantic","title":"...","description":"..."}\n]'
              }
            />
          </label>
        </form>
      </Modal>

      {confirmModal}
    </>
  );
}

export default FantasiesDeckPage;
