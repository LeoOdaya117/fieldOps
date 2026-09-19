import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DateRangePicker } from '@/components/ui/date-range-picker';

function todayValue() {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');
}

describe('DateRangePicker', () => {
    it('defaults to any date and submits preset ranges as date values', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <form>
                <DateRangePicker id="date-range" fromName="from" toName="to" />
            </form>,
        );

        const trigger = screen.getByRole('button', { name: 'Date range' });

        expect(trigger).toHaveTextContent('Any date');
        expect(container.querySelector('input[name="from"]')).toHaveValue('');
        expect(container.querySelector('input[name="to"]')).toHaveValue('');

        await user.click(trigger);
        await user.click(screen.getByRole('menuitem', { name: 'Today' }));

        expect(trigger).not.toHaveTextContent('Any date');
        expect(container.querySelector('input[name="from"]')).toHaveValue(
            todayValue(),
        );
        expect(container.querySelector('input[name="to"]')).toHaveValue(
            todayValue(),
        );
    });

    it('supports a custom range without exposing native select controls', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <form>
                <DateRangePicker
                    id="custom-range"
                    fromName="from"
                    toName="to"
                />
            </form>,
        );

        await user.click(screen.getByRole('button', { name: 'Date range' }));
        await user.click(
            screen.getByRole('menuitem', { name: 'Custom range' }),
        );
        fireEvent.change(screen.getByLabelText('Date range from'), {
            target: { value: '2026-09-01' },
        });
        fireEvent.change(screen.getByLabelText('Date range to'), {
            target: { value: '2026-09-19' },
        });
        await user.click(screen.getByRole('button', { name: 'Apply range' }));

        expect(container.querySelector('input[name="from"]')).toHaveValue(
            '2026-09-01',
        );
        expect(container.querySelector('input[name="to"]')).toHaveValue(
            '2026-09-19',
        );
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
