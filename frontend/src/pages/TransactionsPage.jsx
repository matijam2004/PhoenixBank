import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAccounts } from "../hooks/accounts";
import { useTransactionsByCustomer, useTransactions } from "../hooks/transactions";
import { useUser } from "../hooks/auth";
import TransactionTable from "../components/TransactionTable";

// util imports
import { getLastAndCurrentMonthRange, to_ISOStartOfDay, to_ISOEndOfDay } from "../utils/dates";

// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/transactions-page.css";

function TransactionsPage() {
  const { start_date: defaultStart, end_date: defaultEnd } = useMemo(() => getLastAndCurrentMonthRange(), []);

  const [dateRange, setDateRange] = useState({
    startDate: defaultStart,
    endDate: defaultEnd,
  });

  const startISO = useMemo(() => to_ISOStartOfDay(dateRange.startDate), [dateRange.startDate]);
  const endISO = useMemo(() => to_ISOEndOfDay(dateRange.endDate), [dateRange.endDate]);

  const [search, setSearch] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const [selectedTypes, setSelectedTypes] = useState(new Set()); // empty = no restriction (all types)
  // Dynamic data
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const {
    data: transactions = { items: [] },
    isLoading: txnLoading,
    error: txnError,
  } = useTransactions(
    {
      customer_id: user?._id,
      start_date: startISO,
      end_date: endISO,
    },
    {
      enabled: Boolean(user?._id && dateRange.startDate && dateRange.endDate),
    }
  );

  const availableTypes = useMemo(() => {
    if (!transactions?.items) return [];
    const types = new Set(transactions.items.map((t) => (t.type || "").toLowerCase()).filter(Boolean));
    return Array.from(types).sort();
  }, [transactions]);

  const allChecked = availableTypes.length > 0 && selectedTypes.size === availableTypes.length;
  const noneChecked = selectedTypes.size === 0;

  function toggleType(type) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleAll() {
    setSelectedTypes((prev) => {
      if (allChecked || noneChecked) return new Set();
      return new Set(availableTypes);
    });
  }

  const filtered_transactions = useMemo(() => {
    if (!transactions?.items) return { items: [] };

    const term = search?.trim().toLowerCase() || "";
    const minVal = min !== "" ? parseFloat(min) : undefined;
    const maxVal = max !== "" ? parseFloat(max) : undefined;

    const filtered = transactions.items.filter((t) => {
      const amount = Number(t.amount);

      const matchesAmount =
        (minVal === undefined && maxVal === undefined) ||
        (minVal !== undefined && maxVal === undefined && amount >= minVal) ||
        (minVal === undefined && maxVal !== undefined && amount <= maxVal) ||
        (minVal !== undefined && maxVal !== undefined && amount >= minVal && amount <= maxVal);

      const matchesTerm = term === "" || t.created_at?.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term) || t.status?.toLowerCase().includes(term);

      const tType = (t.type || "").toLowerCase();
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(tType);

      return matchesAmount && matchesType && matchesTerm;
    });

    return { ...transactions, items: filtered };
  }, [transactions, search, min, max, selectedTypes]);

  return (
    <>
      <div className="container transactions-page">
        {}
        <section className="component">
          <h1>Your Transactions</h1>
          <section className="card filter-panel">
            <form className="camo-form">
              <div className="accordion" id="filter-accordion" data-bs-theme="dark">
                <div className="accordion-item">
                  <h2 className="accordion-header" id="filters-heading">
                    <input className="form-control search-bar mb-3" type="text" name="substring" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <button className="accordion-button btn" type="button" data-bs-toggle="collapse" data-bs-target="#advanced-filters" aria-expanded="false" aria-controls="advanced-filters">
                      <i className="bi bi-filter"></i>
                    </button>
                  </h2>

                  <div id="advanced-filters" className="accordion-collapse collapse" aria-labelledby="filters-heading" data-bs-parent="#filter-accordion">
                    <div className="accordion-body">
                      <div className="date-input date-range">
                        <label className="form-label block text-sm mb-1">Start</label>
                        <input className="form-control form-control-sm" type="date" value={dateRange.startDate} onChange={(e) => setDateRange((r) => ({ ...r, startDate: e.target.value }))} />
                        <label className="block text-sm mb-1">End</label>
                        <input
                          className="form-control form-control-sm"
                          type="date"
                          value={dateRange.endDate}
                          min={dateRange.startDate || undefined} // simple guard
                          onChange={(e) => setDateRange((r) => ({ ...r, endDate: e.target.value }))}
                        />
                      </div>
                      <div className="amount-range">
                        <label className="form-label block text-sm mb-1">Amount</label>
                        <input type="number" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="form-control w-32" />
                        <span className="preposition">to</span>
                        <input type="number" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="form-control w-32" />
                      </div>
                      <div className="type-checkboxes">
                        <label className="form-label block text-sm mb-1">Types</label>
                        <label>
                          <input type="checkbox" className="btn-check" checked={allChecked || noneChecked} onChange={toggleAll} />
                          <span className="btn btn-simple">All</span>
                        </label>

                        {availableTypes.map((type) => (
                          <label key={type}>
                            <input type="checkbox" className="btn-check" checked={selectedTypes.size === 0 ? true : selectedTypes.has(type)} onChange={() => toggleType(type)} />
                            <span className="btn btn-simple">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </section>
          <TransactionTable transactions={filtered_transactions.items} user={user} loading={txnLoading} error={txnError} />
        </section>

        <footer className="cd-foot"></footer>
      </div>
    </>
  );
}

export default TransactionsPage;
