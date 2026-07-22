import { apiRequest } from "./http";

export async function getNavigation() {
  const payload = await apiRequest("/api/navigation");
  return payload.items ?? [];
}

export function reseedNavigation() {
  return apiRequest("/api/admin/navigation/reseed", {
    method: "POST",
  });
}

export function groupNavigationItems(items) {
  const mains = items.filter((item) => Number(item.is_main) === 1);
  const childrenByParent = new Map();

  for (const item of items) {
    if (Number(item.is_main) === 1 || !item.parent_id) {
      continue;
    }

    const parentId = Number(item.parent_id);
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(parentId, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.id - b.id);
  }

  const appMains = mains
    .filter((item) => item.nav_section === "apps")
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.id - b.id);

  const adminMains = mains
    .filter((item) => item.nav_section === "admin")
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.id - b.id);

  return { appMains, adminMains, childrenByParent };
}
