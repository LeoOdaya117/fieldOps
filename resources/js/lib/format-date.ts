export function formatDateTime(value: unknown, fallback = '—'): string {
    if (value == null || value === '') {
        return fallback;
    }

    const date = new Date(String(value));

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          });
}
