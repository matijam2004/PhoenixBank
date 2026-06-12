export const DEBIT_TYPE = ["withdrawal", "withdraw", "payment"];
export const CREDIT_TYPE = ["deposit", "check"];
export const NEUTRAL_TYPE = ["internal", "transfer"];
export const TRANSFER_TYPE = ["internal", "external", "transfer"];

export function countTransactionsTodayByAccount(transactions = []) {
  const today = new Date();
  const result = {};

  for (const t of transactions) {
    const d = new Date(t.created_at);
    const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

    if (!isToday) {
      continue;
    }

    if (t.to_account_id) {
      result[t.to_account_id] = (result[t.to_account_id] || 0) + 1;
    }

    if (t.from_account_id) {
      result[t.from_account_id] = (result[t.from_account_id] || 0) + 1;
    }
  }

  return result;
}

const debitTypes = ["withdraw", "payment"];
const creditTypes = ["deposit"];

const pctChange = (curr, last) => (last === 0 ? (curr === 0 ? 0 : null) : (curr - last) / last);

function sumForMonth(transactions, year, month, { filter, amountOf }) {
  let total = 0;
  for (const t of transactions) {
    const d = new Date(t.date || t.posted_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (!filter(t)) continue;
    total += amountOf(t);
  }
  return total;
}

/**
 * Computes MoM change for total, spending, savings.
 * @returns {
 *  spending: { current, last, changePct },
 *  savings: { current, last, changePct }
 * }
 */
export function getMonthlyChangeBuckets(
  transactions = [],
  customerId,
  {
    // how to detect spending (outflows)
    isSpending = (t) => debitTypes.includes(t.type) || (t.type === "external" && customerId === t.customer_id),
    // how to detect savings (inflows into savings)
    isSavings = (t) => creditTypes.includes(t.type) || (t.type === "external" && customerId !== t.customer_id),
    // how to read numeric amount
    amountOf = (t) => Math.abs(Number(t.amount) || 0),
  } = {}
) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const ly = cm === 0 ? cy - 1 : cy;
  const lm = cm === 0 ? 11 : cm - 1;

  // Spending
  const spendCurr = sumForMonth(transactions, cy, cm, { filter: isSpending, amountOf });
  const spendLast = sumForMonth(transactions, ly, lm, { filter: isSpending, amountOf });

  // Savings
  const saveCurr = sumForMonth(transactions, cy, cm, { filter: isSavings, amountOf });
  const saveLast = sumForMonth(transactions, ly, lm, { filter: isSavings, amountOf });

  return {
    spending: { current: spendCurr, last: spendLast, changePct: pctChange(spendCurr, spendLast) },
    savings: { current: saveCurr, last: saveLast, changePct: pctChange(saveCurr, saveLast) },
  };
}
