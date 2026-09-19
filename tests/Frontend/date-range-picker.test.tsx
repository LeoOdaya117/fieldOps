import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DateRangePicker } from '@/components/ui/date-range-picker';

function formatDateValue(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDateLabel(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

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
        expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        await user.click(screen.getByRole('button', { name: 'Today' }));

        expect(trigger).not.toHaveTextContent('Any date');
        expect(container.querySelector('input[name="from"]')).toHaveValue(
            todayValue(),
        );
        expect(container.querySelector('input[name="to"]')).toHaveValue(
            todayValue(),
        );
    });

    it('supports a custom calendar range without exposing native date fields', async () => {
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
        expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Custom range' }));
        expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
        const firstDate = new Date();
        firstDate.setDate(1);
        const secondDate = new Date(firstDate);
        secondDate.setDate(2);
        await user.click(
            screen.getByRole('button', {
                name: formatDateLabel(firstDate),
            }),
        );
        await user.click(
            screen.getByRole('button', {
                name: formatDateLabel(secondDate),
            }),
        );
        await user.click(screen.getByRole('button', { name: 'Update' }));

        expect(container.querySelector('input[name="from"]')).toHaveValue(
            formatDateValue(firstDate),
        );
        expect(container.querySelector('input[name="to"]')).toHaveValue(
            formatDateValue(secondDate),
        );
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('keeps date inputs hidden until custom range is selected', async () => {
        const user = userEvent.setup();

        render(
            <DateRangePicker
                from="2025-01-01"
                to="2025-12-31"
                label="Date range"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Date range' }));

        expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('To')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Custom range' }));

        expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
    });
});
