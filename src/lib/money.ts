/** Only server-verified prices can be charged; frontend values are presentation-only. */
export function formatRupees(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error("Invalid paise");
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}
export function weightLabel(grams: number): string {
  if (!Number.isSafeInteger(grams) || grams <= 0) throw new Error("Invalid weight");
  return grams >= 1000 && grams % 1000 === 0 ? grams / 1000 + " kg" : grams + " g";
}
