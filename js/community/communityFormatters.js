/** Format a non-negative item count with correct singular/plural wording. */
export function formatCount(value, singular, plural = `${singular}s`) {
  const numeric = Number(value);
  const count = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  const label = count === 1 ? singular : plural;
  return `${new Intl.NumberFormat('en-IN').format(count)} ${label}`;
}
