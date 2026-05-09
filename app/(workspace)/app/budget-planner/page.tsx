"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import {
  DEFAULT_BUDGET_CATEGORIES,
  calculateBudgetCategoryTotals,
  calculateBudgetInsights,
  calculateBudgetSummary,
  getDefaultBudgetTemplate,
  normalizeBudgetMonth,
  type BudgetLineItem,
  type BudgetSummary
} from "@/lib/finance/budget-planner";

type SavedBudgetListItem = {
  id: string;
  title: string;
  budget_month: string;
  updated_at: string;
  summary_preview?: Partial<BudgetSummary>;
};

type SavedBudgetPayload = {
  id: string;
  title: string;
  budget_month: string;
  income_json: BudgetLineItem[];
  expenses_json: BudgetLineItem[];
  summary_json?: BudgetSummary;
  notes?: string | null;
};

const categoryOptions = DEFAULT_BUDGET_CATEGORIES.map((category) => ({
  key: category.key,
  name: category.name,
  isIncome: Boolean(category.isIncome)
}));

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const normalized = normalizeBudgetMonth(month) || currentMonth();
  const [year, monthIndex] = normalized.split("-").map(Number);
  const date = new Date(year, monthIndex, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(value: number | undefined) {
  return currency.format(Number.isFinite(value) ? value ?? 0 : 0);
}

function formatPercent(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

function parseMoney(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function SummaryCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#0A2540]">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function ActionButton({ children, onClick, disabled = false, variant = "secondary" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const classes = variant === "primary"
    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
    : variant === "danger"
      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`print:hidden rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {children}
    </button>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(event) => onChange(parseMoney(event.target.value))}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
    />
  );
}

export default function BudgetPlannerPage() {
  const { user } = useWorkspaceUser();
  const template = useMemo(() => getDefaultBudgetTemplate(), []);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [title, setTitle] = useState(`Monthly Budget - ${currentMonth()}`);
  const [income, setIncome] = useState<BudgetLineItem[]>(template.income);
  const [expenses, setExpenses] = useState<BudgetLineItem[]>(template.expenses);
  const [notes, setNotes] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<Array<{ key: string; name: string; isIncome?: boolean }>>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(DEFAULT_BUDGET_CATEGORIES.map((category) => [category.key, category.key === "income" || category.key === "fixed-expenses"])));
  const [addForm, setAddForm] = useState({ categoryKey: "food", itemName: "", plannedAmount: 0, actualAmount: 0, notes: "" });
  const [savedBudgets, setSavedBudgets] = useState<SavedBudgetListItem[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const allItems = useMemo(() => [...income, ...expenses], [income, expenses]);
  const summary = useMemo(() => calculateBudgetSummary(income, expenses), [income, expenses]);
  const insights = useMemo(() => calculateBudgetInsights(income, expenses), [income, expenses]);
  const allCategoryOptions = useMemo(() => [...categoryOptions, ...customCategories], [customCategories]);
  const totalsByCategory = useMemo(() => {
    const totals = calculateBudgetCategoryTotals(allItems, summary.totalActualIncome);
    return new Map(totals.map((total) => [total.categoryKey, total]));
  }, [allItems, summary.totalActualIncome]);
  const categoriesWithItems = useMemo(() => {
    const categoryMap = new Map(allCategoryOptions.map((category) => [category.key, { ...category, items: [] as BudgetLineItem[] }]));
    for (const item of allItems) {
      const category = categoryMap.get(item.categoryKey) ?? { key: item.categoryKey, name: item.categoryName, items: [] as BudgetLineItem[] };
      category.items.push(item);
      categoryMap.set(item.categoryKey, category);
    }
    return Array.from(categoryMap.values()).filter((category) => category.items.length > 0);
  }, [allCategoryOptions, allItems]);

  const getTokenOrSetError = useCallback(async () => {
    const token = await getIdentityToken(user);
    if (!token) setStatus({ type: "error", message: "Your session could not be verified. Please sign in again." });
    return token;
  }, [user]);

  const loadBudgetList = useCallback(async () => {
    const token = await getTokenOrSetError();
    if (!token) return;
    try {
      const response = await fetch("/.netlify/functions/budget-list", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { budgets?: SavedBudgetListItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load saved budgets.");
      setSavedBudgets(payload.budgets ?? []);
      if (!selectedSavedId && payload.budgets?.[0]) setSelectedSavedId(payload.budgets[0].id);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to load saved budgets." });
    }
  }, [getTokenOrSetError, selectedSavedId]);

  useEffect(() => {
    void loadBudgetList();
  }, [loadBudgetList]);

  const updateItem = (id: string, updates: Partial<BudgetLineItem>) => {
    const apply = (items: BudgetLineItem[]) => items.map((item) => item.id === id ? { ...item, ...updates } : item);
    setIncome(apply);
    setExpenses(apply);
  };

  const removeItem = (id: string) => {
    setIncome((items) => items.filter((item) => item.id !== id || item.isDefault));
    setExpenses((items) => items.filter((item) => item.id !== id || item.isDefault));
  };

  const addCustomCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const key = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
    setCustomCategories((categories) => [...categories, { key, name }]);
    setExpanded((current) => ({ ...current, [key]: true }));
    setAddForm((form) => ({ ...form, categoryKey: key }));
    setNewCategoryName("");
  };

  const addItem = () => {
    const option = allCategoryOptions.find((category) => category.key === addForm.categoryKey);
    const itemName = addForm.itemName.trim();
    if (!option || !itemName) {
      setStatus({ type: "error", message: "Choose a category and enter an item name." });
      return;
    }
    const item: BudgetLineItem = {
      id: crypto.randomUUID(),
      categoryKey: option.key,
      categoryName: option.name,
      itemName,
      plannedAmount: addForm.plannedAmount,
      actualAmount: addForm.actualAmount,
      notes: addForm.notes,
      isDefault: false
    };
    if (option.isIncome) setIncome((items) => [...items, item]);
    else setExpenses((items) => [...items, item]);
    setExpanded((current) => ({ ...current, [option.key]: true }));
    setAddForm((form) => ({ ...form, itemName: "", plannedAmount: 0, actualAmount: 0, notes: "" }));
  };

  const saveBudget = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setStatus(null);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch("/.netlify/functions/budget-save", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ id: budgetId ?? undefined, month, title, income, expenses, notes })
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save budget.");
      setBudgetId(payload.id ?? null);
      setSelectedSavedId(payload.id ?? "");
      setStatus({ type: "success", message: "Budget saved." });
      await loadBudgetList();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to save budget." });
    } finally {
      setIsSaving(false);
    }
  };

  const loadBudget = async (id = selectedSavedId) => {
    if (!id) return;
    setIsLoading(true);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`/.netlify/functions/budget-get?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { budget?: SavedBudgetPayload; error?: string };
      if (!response.ok || !payload.budget) throw new Error(payload.error ?? "Unable to load budget.");
      setBudgetId(payload.budget.id);
      setMonth(payload.budget.budget_month);
      setTitle(payload.budget.title);
      setIncome(payload.budget.income_json ?? []);
      setExpenses(payload.budget.expenses_json ?? []);
      const defaultKeys = new Set(categoryOptions.map((category) => category.key));
      const loadedCustomCategories = [...(payload.budget.income_json ?? []), ...(payload.budget.expenses_json ?? [])]
        .filter((item) => !defaultKeys.has(item.categoryKey))
        .reduce<Array<{ key: string; name: string; isIncome?: boolean }>>((categories, item) => {
          if (!categories.some((category) => category.key === item.categoryKey)) {
            categories.push({ key: item.categoryKey, name: item.categoryName, isIncome: item.categoryKey === "income" });
          }
          return categories;
        }, []);
      setCustomCategories(loadedCustomCategories);
      setNotes(payload.budget.notes ?? "");
      setSelectedSavedId(payload.budget.id);
      setStatus({ type: "success", message: "Budget loaded." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to load budget." });
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateBudget = async (id = selectedSavedId, targetMonth = nextMonth(month)) => {
    if (!id) return;
    const token = await getTokenOrSetError();
    if (!token) return;
    try {
      const response = await fetch("/.netlify/functions/budget-duplicate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ id, newMonth: targetMonth })
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "Unable to duplicate budget.");
      await loadBudgetList();
      await loadBudget(payload.id);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to duplicate budget." });
    }
  };

  const deleteBudget = async (id = selectedSavedId) => {
    if (!id) return;
    const token = await getTokenOrSetError();
    if (!token) return;
    try {
      const response = await fetch("/.netlify/functions/budget-delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ id })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete budget.");
      if (budgetId === id) setBudgetId(null);
      setSelectedSavedId("");
      setStatus({ type: "success", message: "Budget deleted." });
      await loadBudgetList();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to delete budget." });
    }
  };

  return (
    <div className="budget-print-page space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Monthly planning</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#0A2540]">Budget Planner</h1>
            <p className="mt-2 text-sm text-slate-600">Plan your monthly spending, track actual expenses, and see what is left at the end of the month.</p>
          </div>
          <div className="print:hidden flex flex-wrap gap-2">
            <ActionButton onClick={saveBudget} disabled={isSaving} variant="primary">{isSaving ? "Saving..." : "Save Budget"}</ActionButton>
            <ActionButton onClick={() => window.print()}>Print / Save as PDF</ActionButton>
            <ActionButton onClick={() => duplicateBudget()} disabled={!selectedSavedId}>Duplicate Previous Month</ActionButton>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
          <label className="text-sm font-medium text-slate-700">
            Month selector
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Budget title
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <p className="mt-4 hidden text-xs text-slate-500 print:block">Generated date: {new Date().toLocaleDateString()}</p>
        {status ? <p className={`print:hidden mt-4 rounded-lg px-3 py-2 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{status.message}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Planned Income" value={formatCurrency(summary.totalPlannedIncome)} />
        <SummaryCard label="Actual Income" value={formatCurrency(summary.totalActualIncome)} />
        <SummaryCard label="Planned Expenses" value={formatCurrency(summary.totalPlannedExpenses)} />
        <SummaryCard label="Actual Expenses" value={formatCurrency(summary.totalActualExpenses)} />
        <SummaryCard label="Planned Surplus" value={formatCurrency(summary.plannedSurplus)} />
        <SummaryCard label="Actual Surplus" value={formatCurrency(summary.actualSurplus)} />
        <SummaryCard label="Over / Under Budget" value={formatCurrency(summary.variance)} note={summary.variance >= 0 ? "Under budget" : "Over budget"} />
        <SummaryCard label="Savings Rate" value={formatPercent(summary.savingsRate)} />
      </section>

      <section className="space-y-4">
        {categoriesWithItems.map((category) => {
          const total = totalsByCategory.get(category.key);
          const isOpen = expanded[category.key] ?? false;
          return (
            <article key={category.key} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => setExpanded((current) => ({ ...current, [category.key]: !isOpen }))} className="print:hidden flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="font-semibold text-[#0A2540]">{category.name}</span>
                <span className="text-sm text-slate-500">{isOpen ? "Collapse" : "Expand"}</span>
              </button>
              <div className="grid gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:grid-cols-4">
                <p><span className="block text-xs uppercase tracking-wide text-slate-500">Planned total</span><strong>{formatCurrency(total?.plannedTotal)}</strong></p>
                <p><span className="block text-xs uppercase tracking-wide text-slate-500">Actual total</span><strong>{formatCurrency(total?.actualTotal)}</strong></p>
                <p><span className="block text-xs uppercase tracking-wide text-slate-500">Difference</span><strong>{formatCurrency(total?.difference)}</strong></p>
                <p><span className="block text-xs uppercase tracking-wide text-slate-500">% of income</span><strong>{formatPercent(total?.percentOfIncome ?? 0)}</strong></p>
              </div>
              {isOpen ? (
                <div className="overflow-x-auto px-4 pb-4">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Item name</th>
                        <th className="py-2 pr-3">Planned amount</th>
                        <th className="py-2 pr-3">Actual amount</th>
                        <th className="py-2 pr-3">Difference</th>
                        <th className="py-2 pr-3">Notes</th>
                        <th className="print:hidden py-2">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-800">{item.itemName}</td>
                          <td className="py-2 pr-3"><MoneyInput value={item.plannedAmount} onChange={(value) => updateItem(item.id, { plannedAmount: value })} /></td>
                          <td className="py-2 pr-3"><MoneyInput value={item.actualAmount} onChange={(value) => updateItem(item.id, { actualAmount: value })} /></td>
                          <td className="py-2 pr-3 text-slate-700">{formatCurrency(item.plannedAmount - item.actualAmount)}</td>
                          <td className="py-2 pr-3"><input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></td>
                          <td className="print:hidden py-2">
                            {!item.isDefault ? <ActionButton onClick={() => removeItem(item.id)} variant="danger">Remove</ActionButton> : <span className="text-xs text-slate-400">Default</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="print:hidden grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2540]">Add Item</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-medium text-slate-700">
              Select category
              <select value={addForm.categoryKey} onChange={(event) => setAddForm((form) => ({ ...form, categoryKey: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {allCategoryOptions.map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Item name
              <input value={addForm.itemName} onChange={(event) => setAddForm((form) => ({ ...form, itemName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Planned amount
              <MoneyInput value={addForm.plannedAmount} onChange={(value) => setAddForm((form) => ({ ...form, plannedAmount: value }))} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Actual amount
              <MoneyInput value={addForm.actualAmount} onChange={(value) => setAddForm((form) => ({ ...form, actualAmount: value }))} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Notes
              <input value={addForm.notes} onChange={(event) => setAddForm((form) => ({ ...form, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4">
            <ActionButton onClick={addItem} variant="primary">Add item</ActionButton>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2540]">Custom Category</h2>
          <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Category name" className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="mt-3">
            <ActionButton onClick={addCustomCategory}>Add custom category</ActionButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2540]">Insights</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {insights.map((insight) => <li key={insight}>{insight}</li>)}
          </ul>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <p className="mt-4 text-xs text-slate-500">This tool is for budgeting and planning. Results depend on user-entered information.</p>
          <p className="mt-2 text-xs text-slate-400">TODO: Future: optionally use latest budget to update dashboard cash-flow insights.</p>
          <p className="mt-1 text-xs text-slate-400">TODO: Future: allow Statement of Affairs to optionally pull actual monthly budget averages.</p>
        </div>

        <div className="print:hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2540]">Saved Budgets</h2>
          <select value={selectedSavedId} onChange={(event) => setSelectedSavedId(event.target.value)} className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select saved budget</option>
            {savedBudgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.budget_month} - {budget.title}</option>)}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={() => loadBudget()} disabled={!selectedSavedId || isLoading}>{isLoading ? "Loading..." : "Load"}</ActionButton>
            <ActionButton onClick={() => duplicateBudget()} disabled={!selectedSavedId}>Duplicate</ActionButton>
            <ActionButton onClick={() => deleteBudget()} disabled={!selectedSavedId} variant="danger">Delete</ActionButton>
          </div>
          <div className="mt-4 space-y-3">
            {savedBudgets.map((budget) => (
              <button key={budget.id} type="button" onClick={() => loadBudget(budget.id)} className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-slate-50">
                <span className="block font-semibold text-[#0A2540]">{budget.budget_month} - {budget.title}</span>
                <span className="mt-1 block text-xs text-slate-500">Updated {new Date(budget.updated_at).toLocaleDateString()} · Actual surplus {formatCurrency(Number(budget.summary_preview?.actualSurplus ?? 0))}</span>
              </button>
            ))}
            {savedBudgets.length === 0 ? <p className="text-sm text-slate-500">No saved budgets yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
