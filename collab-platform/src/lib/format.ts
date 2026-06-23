// Shared formatting helpers. `money` accepts Prisma.Decimal | number | string.
export function money(v: unknown): string {
  const n = Number(v ?? 0);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function num(v: unknown): number {
  return Number(v ?? 0);
}

export function fmtDate(d: Date | null | undefined): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}
