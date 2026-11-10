export function isOverlapViolation(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return text.includes("appointment_no_overlap") || text.includes("23P01");
}