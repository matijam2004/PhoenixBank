export function to_$(n) {
  const num = Number(n);

  if (isNaN(num)) {
    return n;
  }

  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function to_percent(n) {
  return n.toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
