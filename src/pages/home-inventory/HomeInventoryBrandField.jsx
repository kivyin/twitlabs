import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  createHomeInventoryBrand,
  listHomeInventoryBrands,
} from "../../api/homeInventoryApi";

/**
 * Type-to-search the brand catalog, or free-type any brand on this item.
 * Free-typed brands are NOT added to the catalog unless you click “Add to brand list”.
 */
function HomeInventoryBrandField({ value, onChange, disabled = false }) {
  const listId = useId();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");

  const loadBrands = async (query) => {
    setLoading(true);
    try {
      const payload = await listHomeInventoryBrands({ q: query.trim() || undefined });
      setBrands(payload.brands || []);
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      await loadBrands(value);
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const trimmed = String(value || "").trim();
  const exactMatch = brands.some((brand) => brand.toLowerCase() === trimmed.toLowerCase());
  const suggestions = useMemo(() => {
    const current = trimmed.toLowerCase();
    return brands.filter((brand) => brand.toLowerCase() !== current).slice(0, 12);
  }, [brands, trimmed]);

  const canAddToList = Boolean(trimmed) && !exactMatch;

  const handleAddToList = async () => {
    if (!canAddToList || adding) return;
    setAdding(true);
    setStatus("");
    try {
      const result = await createHomeInventoryBrand(trimmed);
      onChange(result.brand || trimmed);
      setStatus(`“${result.brand || trimmed}” added to brand list.`);
      await loadBrands(result.brand || trimmed);
      setOpen(false);
    } catch (error) {
      setStatus(error.message || "Could not add brand.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="home-inv-brand-field" ref={wrapRef}>
      <label htmlFor={listId}>
        Brand
        <input
          id={listId}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder="Type to search or enter a brand…"
          maxLength={120}
          onChange={(event) => {
            onChange(event.target.value);
            setStatus("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && (suggestions.length > 0 || loading) ? (
        <ul className="home-inv-brand-suggestions" role="listbox">
          {loading && suggestions.length === 0 ? (
            <li className="home-inv-brand-empty">Searching…</li>
          ) : (
            suggestions.map((brand) => (
              <li key={brand}>
                <button
                  type="button"
                  className="home-inv-brand-option"
                  onClick={() => {
                    onChange(brand);
                    setOpen(false);
                    setStatus("");
                  }}
                >
                  {brand}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {canAddToList ? (
        <button
          type="button"
          className="button home-inv-brand-add"
          disabled={disabled || adding}
          onClick={handleAddToList}
        >
          {adding ? "Adding…" : `Add “${trimmed}” to brand list`}
        </button>
      ) : null}
      <p className="stat-meta home-inv-brand-hint">
        Search the brand list, or type a one-off. One-offs stay on this item only unless you add them
        to the list.
      </p>
      {status ? <p className="subtext">{status}</p> : null}
    </div>
  );
}

export default HomeInventoryBrandField;
