export const SIDEBAR_NAV_LAYOUT_KEY = "sidebar-nav-layout";

/**
 * Default catalog order: app mains, then each parent's children, then admin mains + children.
 */
export function getNavLayoutCatalog(appMains, adminMains, childrenByParent) {
  const entries = [];
  const labels = {};

  const pushMain = (main, sectionLabel) => {
    const id = String(main.id);
    entries.push(id);
    labels[id] =
      sectionLabel && main.nav_section === "admin"
        ? `${main.label} (Admin)`
        : String(main.label);

    const children = childrenByParent.get(Number(main.id)) ?? [];
    for (const child of children) {
      const childId = String(child.id);
      entries.push(childId);
      labels[childId] = `${main.label} › ${child.label}`;
    }
  };

  for (const main of appMains) {
    pushMain(main, "apps");
  }
  for (const main of adminMains) {
    pushMain(main, "admin");
  }

  return { catalogIds: entries, labels };
}

export function normalizeVisibleNavIds(savedIds, catalogIds) {
  const catalog = catalogIds.map(String);
  if (savedIds === undefined || savedIds === null) {
    return catalog;
  }
  if (!Array.isArray(savedIds)) {
    return catalog;
  }
  const catalogSet = new Set(catalog);
  return savedIds.map(String).filter((id) => catalogSet.has(id));
}

function orderByVisibleIds(items, visibleIdSet, visibleIds) {
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const ordered = [];
  for (const id of visibleIds) {
    const item = byId.get(String(id));
    if (item) {
      ordered.push(item);
    }
  }
  // Keep only items that are in the visible set (visibleIds may include children).
  return ordered.filter((item) => visibleIdSet.has(String(item.id)));
}

/**
 * Apply a saved visible-id order to grouped navigation.
 * Missing preference → unchanged groups. Empty preference → hide all customizable items.
 */
export function applyNavLayout(grouped, visibleNavIds) {
  const { appMains, adminMains, childrenByParent } = grouped;
  if (!Array.isArray(visibleNavIds)) {
    return grouped;
  }

  const visibleIdSet = new Set(visibleNavIds.map(String));
  const visibleIds = visibleNavIds.map(String);

  const nextAppMains = orderByVisibleIds(appMains, visibleIdSet, visibleIds);
  const nextAdminMains = orderByVisibleIds(adminMains, visibleIdSet, visibleIds);
  const nextChildrenByParent = new Map();

  for (const main of [...nextAppMains, ...nextAdminMains]) {
    const parentId = Number(main.id);
    const children = childrenByParent.get(parentId) ?? [];
    const nextChildren = orderByVisibleIds(children, visibleIdSet, visibleIds);
    nextChildrenByParent.set(parentId, nextChildren);
  }

  return {
    appMains: nextAppMains,
    adminMains: nextAdminMains,
    childrenByParent: nextChildrenByParent,
  };
}
