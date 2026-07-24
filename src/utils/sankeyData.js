export const SANKEY_HUB_ID = "spending-hub";
export const SANKEY_HUB_LABEL = "Spending";

/**
 * Map cash-flow Sankey API rows into Nivo nodes/links.
 * Topology: income categories → Spending hub → expense categories.
 */
export function rowsToSankeyData({ income = [], expenses = [] } = {}) {
  const incomeRows = income.filter((row) => Number(row.total) > 0);
  const expenseRows = expenses.filter((row) => Number(row.total) > 0);

  if (incomeRows.length === 0 && expenseRows.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodes = [{ id: SANKEY_HUB_ID, nodeLabel: SANKEY_HUB_LABEL }];
  const links = [];
  const usedIds = new Set([SANKEY_HUB_ID]);

  const uniqueNodeId = (prefix, categoryId, categoryName) => {
    const base = `${prefix}:${categoryId ?? categoryName}`;
    if (!usedIds.has(base)) {
      usedIds.add(base);
      return base;
    }
    let index = 2;
    while (usedIds.has(`${base}:${index}`)) {
      index += 1;
    }
    const next = `${base}:${index}`;
    usedIds.add(next);
    return next;
  };

  for (const row of incomeRows) {
    const id = uniqueNodeId("income", row.category_id, row.category_name);
    nodes.push({ id, nodeLabel: row.category_name });
    links.push({
      source: id,
      target: SANKEY_HUB_ID,
      value: Number(row.total) || 0,
    });
  }

  for (const row of expenseRows) {
    const id = uniqueNodeId("expense", row.category_id, row.category_name);
    nodes.push({ id, nodeLabel: row.category_name });
    links.push({
      source: SANKEY_HUB_ID,
      target: id,
      value: Number(row.total) || 0,
    });
  }

  // Nivo requires every node to participate in at least one link.
  // If only one side has data, add a balancing stub so the chart still renders.
  if (incomeRows.length === 0 && expenseRows.length > 0) {
    const stubId = "income:unassigned";
    nodes.push({ id: stubId, nodeLabel: "Uncategorized income" });
    const expenseTotal = expenseRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    links.push({ source: stubId, target: SANKEY_HUB_ID, value: expenseTotal || 0.01 });
  }

  if (expenseRows.length === 0 && incomeRows.length > 0) {
    const stubId = "expense:unassigned";
    nodes.push({ id: stubId, nodeLabel: "Unallocated" });
    const incomeTotal = incomeRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    links.push({ source: SANKEY_HUB_ID, target: stubId, value: incomeTotal || 0.01 });
  }

  return { nodes, links };
}
