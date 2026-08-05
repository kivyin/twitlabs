import { useEffect, useMemo, useRef, useState } from "react";
import {
  createShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  deleteShoppingList,
  getShoppingList,
  listShoppingLists,
  updateShoppingItem,
  updateShoppingList,
} from "../../api/calendarApi";

const NEW_LIST_VALUE = "__new__";

function MoveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 7h8" />
      <path d="M16 7 13 4" />
      <path d="M16 7 13 10" />
      <path d="M16 17H8" />
      <path d="M8 17 11 14" />
      <path d="M8 17 11 20" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CalendarShoppingModal({ open, onClose }) {
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeList, setActiveList] = useState(null);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [moveMenuItemId, setMoveMenuItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draftRef = useRef(null);
  const newListRef = useRef(null);
  const skipDraftBlurRef = useRef(false);
  const listNameSnapshotRef = useRef("");

  const activeLists = useMemo(
    () => lists.filter((list) => list.status === "active"),
    [lists]
  );
  const otherActiveLists = useMemo(
    () => activeLists.filter((list) => list.id !== activeListId),
    [activeLists, activeListId]
  );

  const refreshLists = async () => {
    const payload = await listShoppingLists({ includeClosed: true });
    const nextLists = payload.lists || [];
    setLists(nextLists);
    return nextLists;
  };

  const loadActiveList = async (listId) => {
    if (!listId) {
      setActiveList(null);
      listNameSnapshotRef.current = "";
      return;
    }
    const detail = await getShoppingList(listId);
    setActiveList(detail.list);
    listNameSnapshotRef.current = detail.list?.name || "";
  };

  const bootstrap = async ({ preferredListId = null } = {}) => {
    setLoading(true);
    setError("");
    try {
      const nextLists = await refreshLists();
      const visible = includeClosed
        ? nextLists
        : nextLists.filter((list) => list.status === "active");

      const preferred =
        preferredListId && visible.some((list) => list.id === preferredListId)
          ? preferredListId
          : preferredListId && nextLists.some((list) => list.id === preferredListId)
            ? preferredListId
            : null;

      const nextId =
        preferred ||
        (activeListId && visible.some((list) => list.id === activeListId) ? activeListId : null) ||
        visible.find((list) => list.status === "active")?.id ||
        visible[0]?.id ||
        null;

      setActiveListId(nextId);
      if (nextId) {
        await loadActiveList(nextId);
      } else {
        setActiveList(null);
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load shopping lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setCreatingList(false);
    setNewListName("");
    setDraftOpen(false);
    setDraftName("");
    setMoveMenuItemId(null);
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, includeClosed]);

  useEffect(() => {
    setMoveMenuItemId(null);
  }, [activeListId]);

  useEffect(() => {
    if (moveMenuItemId == null) return undefined;
    const onPointerDown = (event) => {
      if (event.target.closest?.(".calendar-shopping-move-wrap")) return;
      setMoveMenuItemId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moveMenuItemId]);

  useEffect(() => {
    if (!open || !activeListId || creatingList) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await getShoppingList(activeListId);
        if (!cancelled) {
          setActiveList(detail.list);
          listNameSnapshotRef.current = detail.list?.name || "";
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not load shopping list.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeListId, open, creatingList]);

  useEffect(() => {
    if (draftOpen && draftRef.current) {
      draftRef.current.focus();
    }
  }, [draftOpen, activeListId]);

  useEffect(() => {
    if (creatingList && newListRef.current) {
      newListRef.current.focus();
    }
  }, [creatingList]);

  if (!open) return null;

  const visibleLists = includeClosed ? lists : lists.filter((list) => list.status === "active");
  const items = activeList?.items || [];

  const handleListSelect = (value) => {
    if (value === NEW_LIST_VALUE) {
      setCreatingList(true);
      setNewListName("");
      setDraftOpen(false);
      setDraftName("");
      return;
    }
    setCreatingList(false);
    setActiveListId(Number(value));
    setDraftOpen(false);
    setDraftName("");
  };

  const handleCreateList = async (event) => {
    event?.preventDefault?.();
    const name = newListName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const result = await createShoppingList({ name });
      setCreatingList(false);
      setNewListName("");
      setIncludeClosed(false);
      await bootstrap({ preferredListId: result.list?.id });
      setDraftOpen(true);
    } catch (createError) {
      setError(createError.message || "Could not create list.");
    } finally {
      setBusy(false);
    }
  };

  const handleRenameBlur = async () => {
    if (!activeList || !activeListId) return;
    const name = String(activeList.name || "").trim();
    if (!name || name === listNameSnapshotRef.current) return;
    setBusy(true);
    setError("");
    try {
      await updateShoppingList(activeListId, { name });
      listNameSnapshotRef.current = name;
      await refreshLists();
    } catch (renameError) {
      setError(renameError.message || "Could not rename list.");
      await loadActiveList(activeListId);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!activeList) return;
    const nextStatus = activeList.status === "active" ? "closed" : "active";
    setBusy(true);
    setError("");
    try {
      await updateShoppingList(activeList.id, { status: nextStatus });
      if (nextStatus === "closed" && !includeClosed) {
        setIncludeClosed(true);
      }
      await bootstrap({ preferredListId: activeList.id });
    } catch (statusError) {
      setError(statusError.message || "Could not update list status.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteList = async () => {
    if (!activeListId) return;
    if (!window.confirm("Delete this shopping list and all of its items?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteShoppingList(activeListId);
      setActiveListId(null);
      setActiveList(null);
      await bootstrap();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete list.");
    } finally {
      setBusy(false);
    }
  };

  const commitDraftItem = async () => {
    if (!activeListId || activeList?.status === "closed") return false;
    const name = draftName.trim();
    if (!name) return false;
    setBusy(true);
    setError("");
    try {
      await createShoppingItem(activeListId, { name });
      setDraftName("");
      await loadActiveList(activeListId);
      await refreshLists();
      // Keep drafting so the next item is ready immediately.
      setDraftOpen(true);
      window.requestAnimationFrame(() => draftRef.current?.focus());
      return true;
    } catch (addError) {
      setError(addError.message || "Could not add item.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDraftKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      skipDraftBlurRef.current = true;
      await commitDraftItem();
      skipDraftBlurRef.current = false;
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (!draftName.trim()) {
        setDraftOpen(false);
      } else {
        setDraftName("");
      }
    }
  };

  const handleTogglePurchased = async (item) => {
    setBusy(true);
    setError("");
    try {
      await updateShoppingItem(item.id, { purchased: !item.purchased });
      await loadActiveList(activeListId);
      await refreshLists();
    } catch (toggleError) {
      setError(toggleError.message || "Could not update item.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (item) => {
    setBusy(true);
    setError("");
    try {
      await deleteShoppingItem(item.id);
      await loadActiveList(activeListId);
      await refreshLists();
    } catch (removeError) {
      setError(removeError.message || "Could not remove item.");
    } finally {
      setBusy(false);
    }
  };

  const handleMoveItem = async (item, targetListId) => {
    const listId = Number(targetListId);
    if (!listId || listId === item.list_id) return;
    setBusy(true);
    setError("");
    setMoveMenuItemId(null);
    try {
      await updateShoppingItem(item.id, { list_id: listId });
      await loadActiveList(activeListId);
      await refreshLists();
    } catch (moveError) {
      setError(moveError.message || "Could not move item.");
    } finally {
      setBusy(false);
    }
  };

  const canMoveItems = otherActiveLists.length > 0;

  return (
    <div className="calendar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="calendar-modal calendar-shopping-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping list"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="calendar-modal-header">
          <h2>Shopping list</h2>
          <button type="button" className="calendar-touch-btn ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="calendar-shopping-toolbar">
          {creatingList ? (
            <form className="calendar-shopping-create-inline" onSubmit={handleCreateList}>
              <input
                ref={newListRef}
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Name this list…"
                disabled={busy}
                autoComplete="off"
              />
              <button
                type="submit"
                className="calendar-touch-btn primary"
                disabled={busy || !newListName.trim()}
              >
                Create
              </button>
              <button
                type="button"
                className="calendar-touch-btn ghost"
                disabled={busy}
                onClick={() => {
                  setCreatingList(false);
                  setNewListName("");
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <label className="calendar-shopping-select-label">
              List
              <select
                value={activeListId ?? ""}
                onChange={(event) => handleListSelect(event.target.value)}
                disabled={busy || loading}
              >
                {visibleLists.length === 0 && <option value="">No lists yet</option>}
                {visibleLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                    {list.status === "closed" ? " (closed)" : ""}
                    {` — ${list.purchased_count}/${list.item_count}`}
                  </option>
                ))}
                <option value={NEW_LIST_VALUE}>＋ New list…</option>
              </select>
            </label>
          )}

          <label className="calendar-checkbox-row calendar-shopping-closed-toggle">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(event) => setIncludeClosed(event.target.checked)}
              disabled={busy || loading}
            />
            Show closed
          </label>
        </div>

        {loading && <p className="subtext calendar-shopping-status">Loading…</p>}
        {error && <p className="error calendar-shopping-error">{error}</p>}

        {!loading && !creatingList && !activeList && (
          <div className="calendar-shopping-empty">
            <p className="subtext">No shopping list selected.</p>
            <button
              type="button"
              className="calendar-touch-btn primary"
              onClick={() => handleListSelect(NEW_LIST_VALUE)}
            >
              Create a list
            </button>
          </div>
        )}

        {!loading && !creatingList && activeList && (
          <section className="calendar-shopping-focus">
            <div className="calendar-shopping-title-row">
              <input
                className="calendar-shopping-title-input"
                value={activeList.name}
                onChange={(event) =>
                  setActiveList((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
                onBlur={handleRenameBlur}
                disabled={busy}
                aria-label="List name"
              />
              <div className="calendar-shopping-list-actions">
                <button
                  type="button"
                  className="calendar-touch-btn"
                  disabled={busy}
                  onClick={handleToggleStatus}
                >
                  {activeList.status === "active" ? "Close list" : "Reopen"}
                </button>
                <button
                  type="button"
                  className="danger-button calendar-touch-btn"
                  disabled={busy}
                  onClick={handleDeleteList}
                >
                  Delete
                </button>
              </div>
            </div>

            {activeList.status === "closed" && (
              <p className="subtext">This list is closed. Reopen it to add items.</p>
            )}

            <ul className="calendar-shopping-items">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`calendar-shopping-item${item.purchased ? " is-purchased" : ""}`}
                >
                  <span className="calendar-shopping-item-name">{item.name}</span>
                  <div className="calendar-shopping-item-actions">
                    {canMoveItems && (
                      <div className="calendar-shopping-move-wrap">
                        <button
                          type="button"
                          className="calendar-shopping-icon-btn"
                          disabled={busy}
                          aria-label={`Move ${item.name} to another list`}
                          aria-expanded={moveMenuItemId === item.id}
                          onClick={() =>
                            setMoveMenuItemId((prev) => (prev === item.id ? null : item.id))
                          }
                        >
                          <MoveIcon />
                        </button>
                        {moveMenuItemId === item.id && (
                          <div className="calendar-shopping-move-menu" role="menu">
                            <p className="calendar-shopping-move-menu-label">Move to</p>
                            {otherActiveLists.map((list) => (
                              <button
                                key={list.id}
                                type="button"
                                role="menuitem"
                                className="calendar-shopping-move-option"
                                disabled={busy}
                                onClick={() => handleMoveItem(item, list.id)}
                              >
                                {list.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <label className="calendar-shopping-item-check" title="Purchased">
                      <input
                        type="checkbox"
                        checked={item.purchased}
                        onChange={() => handleTogglePurchased(item)}
                        disabled={busy}
                        aria-label={`Mark ${item.name} purchased`}
                      />
                    </label>
                    <button
                      type="button"
                      className="calendar-shopping-icon-btn is-danger"
                      disabled={busy}
                      aria-label={`Remove ${item.name}`}
                      onClick={() => handleRemoveItem(item)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}

              {activeList.status === "active" && (
                <li className="calendar-shopping-draft-row">
                  {draftOpen ? (
                    <input
                      ref={draftRef}
                      className="calendar-shopping-draft-input"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      onBlur={async () => {
                        if (skipDraftBlurRef.current) return;
                        if (draftName.trim()) {
                          await commitDraftItem();
                        } else {
                          setDraftOpen(false);
                        }
                      }}
                      placeholder="Item name…"
                      disabled={busy}
                      autoComplete="off"
                    />
                  ) : (
                    <button
                      type="button"
                      className="calendar-shopping-add-row-btn"
                      disabled={busy}
                      onClick={() => {
                        setDraftOpen(true);
                        setDraftName("");
                      }}
                    >
                      ＋ Add item
                    </button>
                  )}
                </li>
              )}
            </ul>

            {activeList.status === "active" && (
              <p className="stat-meta calendar-shopping-hint">
                Press Enter to add another item. Esc cancels an empty row.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default CalendarShoppingModal;
