import { useEffect, useMemo, useState } from "react";
import {
  addHomeInventoryToDinner,
  deleteHomeInventoryItem,
  deleteHomeInventoryLocation,
  listHomeInventoryItems,
  listHomeInventoryLocations,
  updateHomeInventoryItem,
} from "../../api/homeInventoryApi";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import HomeInventoryItemModal from "./HomeInventoryItemModal";
import HomeInventoryItemThumb from "./HomeInventoryItemThumb";
import HomeInventoryLocationModal from "./HomeInventoryLocationModal";

const PAGE_SIZE = 25;

function formatQty(item) {
  const qty = Number(item.quantity);
  const value = Number.isFinite(qty) ? String(qty) : "—";
  return item.unit ? `${value} ${item.unit}` : value;
}

function HomeInventoryHomePage() {
  const { confirm, confirmModal } = useConfirmDialog();
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [activeLocationId, setActiveLocationId] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [busyItemId, setBusyItemId] = useState(null);
  const [dinnerBusyId, setDinnerBusyId] = useState(null);
  const [status, setStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const load = async ({ keepLocation = true, nextPage = page } = {}) => {
    setError("");
    setLoading(true);
    try {
      const [locationsResult, itemsResult] = await Promise.all([
        listHomeInventoryLocations(),
        listHomeInventoryItems({
          locationId: activeLocationId === "all" ? undefined : activeLocationId,
          q: search.trim() || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        }),
      ]);
      const nextLocations = locationsResult.locations ?? [];
      setLocations(nextLocations);
      setItems(itemsResult.items ?? []);
      setTotalItems(Number(itemsResult.total) || 0);
      setPage(Number(itemsResult.page) || nextPage);
      if (
        keepLocation &&
        activeLocationId !== "all" &&
        !nextLocations.some((location) => String(location.id) === String(activeLocationId))
      ) {
        setActiveLocationId("all");
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      load({ nextPage: 1 });
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeLocation = useMemo(
    () => locations.find((location) => String(location.id) === String(activeLocationId)) || null,
    [locations, activeLocationId]
  );

  const openAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    const ok = await confirm({
      title: "Delete item?",
      message: `Remove “${item.name}” from inventory?`,
      confirmLabel: "Delete item",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteHomeInventoryItem(item.id);
      const nextCount = Math.max(0, totalItems - 1);
      const nextPages = Math.max(1, Math.ceil(nextCount / PAGE_SIZE));
      const nextPage = Math.min(page, nextPages);
      await load({ nextPage });
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const adjustQuantity = async (item, delta) => {
    const next = Math.max(0, Number(item.quantity || 0) + delta);
    setBusyItemId(item.id);
    setError("");
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, quantity: next } : row))
    );
    try {
      const result = await updateHomeInventoryItem(item.id, { quantity: next });
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ...result.item } : row))
      );
    } catch (updateError) {
      setError(updateError.message);
      await load({ nextPage: page });
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteLocation = async (location) => {
    const ok = await confirm({
      title: "Delete location?",
      message: `Delete “${location.name}” and all items stored there?`,
      confirmLabel: "Delete location",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteHomeInventoryLocation(location.id);
      if (String(activeLocationId) === String(location.id)) {
        setActiveLocationId("all");
      }
      await load({ keepLocation: false, nextPage: 1 });
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleAddToDinner = async (item) => {
    setDinnerBusyId(item.id);
    setError("");
    setStatus("");
    try {
      const result = await addHomeInventoryToDinner({ itemId: item.id });
      setStatus(result.message || `Added “${item.name}” to tonight’s dinner.`);
    } catch (dinnerError) {
      setError(dinnerError.message);
    } finally {
      setDinnerBusyId(null);
    }
  };

  const goToPage = (nextPage) => {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    setPage(clamped);
    load({ nextPage: clamped });
  };

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Home Inventory" }]}
        title="Home Inventory"
        subtitle="Track food by freezer and fridge location — built for phones."
      />

      {error ? <p className="error">{error}</p> : null}
      {status ? <p className="subtext">{status}</p> : null}

      <section className="panel home-inv-toolbar">
        <label className="home-inv-search">
          <span className="sr-only">Search items</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search items…"
            enterKeyHint="search"
          />
        </label>
        <div className="home-inv-toolbar-actions">
          <button type="button" className="button-primary home-inv-touch-btn-wide" onClick={openAddItem}>
            Add item
          </button>
          <button
            type="button"
            className="button home-inv-touch-btn-wide"
            onClick={() => {
              setEditingLocation(null);
              setLocationModalOpen(true);
            }}
          >
            Add location
          </button>
        </div>
      </section>

      <section className="home-inv-location-rail" aria-label="Storage locations">
        <button
          type="button"
          className={`home-inv-location-chip${activeLocationId === "all" ? " is-active" : ""}`}
          onClick={() => setActiveLocationId("all")}
        >
          <strong>All</strong>
          <span>{locations.reduce((sum, row) => sum + Number(row.item_count || 0), 0)} items</span>
        </button>
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            className={`home-inv-location-chip${
              String(activeLocationId) === String(location.id) ? " is-active" : ""
            }`}
            onClick={() => setActiveLocationId(String(location.id))}
          >
            <strong>{location.name}</strong>
            <span>{location.item_count || 0} items</span>
          </button>
        ))}
      </section>

      {activeLocation ? (
        <section className="panel home-inv-location-meta">
          <div>
            <h2>{activeLocation.name}</h2>
            {activeLocation.description ? (
              <p className="subtext">{activeLocation.description}</p>
            ) : null}
          </div>
          <div className="home-inv-location-meta-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                setEditingLocation(activeLocation);
                setLocationModalOpen(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => handleDeleteLocation(activeLocation)}
            >
              Delete
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel home-inv-list-panel">
        {loading ? (
          <p className="subtext">Loading inventory…</p>
        ) : items.length === 0 ? (
          <div className="home-inv-empty">
            <p className="subtext">
              {search.trim()
                ? "No items match that search."
                : "No items here yet. Add what you put in the freezer or fridge."}
            </p>
            <button type="button" className="button-primary" onClick={openAddItem}>
              Add item
            </button>
          </div>
        ) : (
          <>
            <ul className="home-inv-item-list">
              {items.map((item) => (
                <li key={item.id} className="home-inv-item-card">
                  <button
                    type="button"
                    className="home-inv-item-main"
                    onClick={() => openEditItem(item)}
                  >
                    <HomeInventoryItemThumb item={item} />
                    <div className="home-inv-item-copy">
                      <strong title={item.name}>{item.name}</strong>
                      {item.brand ? (
                        <span className="home-inv-item-brand">{item.brand}</span>
                      ) : null}
                      <span className="stat-meta">
                        {[item.location_name, item.description].filter(Boolean).join(" · ") ||
                          "No notes"}
                      </span>
                    </div>
                  </button>

                  <div className="home-inv-item-qty-bar" aria-label={`${item.name} quantity`}>
                    <button
                      type="button"
                      className="button home-inv-touch-btn"
                      disabled={busyItemId === item.id}
                      onClick={() => adjustQuantity(item, -1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>
                    <span className="home-inv-item-qty home-inv-item-qty--bar">{formatQty(item)}</span>
                    <button
                      type="button"
                      className="button home-inv-touch-btn"
                      disabled={busyItemId === item.id}
                      onClick={() => adjustQuantity(item, 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="home-inv-item-actions">
                    <button
                      type="button"
                      className="button home-inv-dinner-btn"
                      disabled={dinnerBusyId === item.id}
                      onClick={() => handleAddToDinner(item)}
                      title="Add to tonight’s dinner"
                      aria-label={`Add ${item.name} to tonight’s dinner`}
                    >
                      {dinnerBusyId === item.id ? "…" : "Dinner"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteItem(item)}
                      aria-label={`Delete ${item.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <nav className="home-inv-pager" aria-label="Inventory pages">
              <p className="subtext">
                Showing {rangeStart}–{rangeEnd} of {totalItems}
              </p>
              <div className="home-inv-pager-controls">
                <button
                  type="button"
                  className="button"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </button>
                <span className="home-inv-pager-status">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      <button type="button" className="home-inv-fab" onClick={openAddItem} aria-label="Add item">
        +
      </button>

      <HomeInventoryItemModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSaved={() => load({ nextPage: page })}
        locations={locations}
        item={editingItem}
        defaultLocationId={
          activeLocationId !== "all" ? activeLocationId : locations[0]?.id || ""
        }
      />
      <HomeInventoryLocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSaved={() => load({ nextPage: page })}
        location={editingLocation}
      />
      {confirmModal}
    </>
  );
}

export default HomeInventoryHomePage;
