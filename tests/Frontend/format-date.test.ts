import { describe, expect, it } from 'vitest';
import { formatDateTime } from '@/lib/format-date';

describe('formatDateTime', () => {
    it('renders a readable date with time', () => {
        const value = formatDateTime('2026-08-30T14:05:00Z');

        expect(value).toContain('2026');
        expect(value).toMatch(/\d{1,2}:\d{2}/);
    });

    it('keeps missing and invalid values safe', () => {
        expect(formatDateTime(null)).toBe('—');
        expect(formatDateTime('not-a-date')).toBe('not-a-date');
    });
});
