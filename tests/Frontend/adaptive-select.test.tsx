import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import type { AdaptiveSelectOption } from '@/components/ui/adaptive-select';

const options: AdaptiveSelectOption[] = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
    { value: 'three', label: 'Three' },
    { value: 'four', label: 'Four' },
];

describe('AdaptiveSelect', () => {
    it('uses multiple-selection checkboxes for five or fewer options', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(
            <AdaptiveSelect
                name="status"
                aria-label="Status"
                options={options}
                onValueChange={onValueChange}
            />,
        );

        expect(screen.getAllByRole('checkbox')).toHaveLength(4);
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.click(screen.getByText('Two'));

        expect(onValueChange).toHaveBeenCalledWith(['two']);
        expect(screen.getByRole('checkbox', { name: 'Two' })).toBeChecked();
    });

    it('submits selected checkbox options as repeated form values', async () => {
        const user = userEvent.setup();

        render(
            <form aria-label="Record status filters">
                <AdaptiveSelect
                    id="record-status"
                    name="record_status"
                    aria-label="Record status"
                    multiple
                    defaultValue={['active']}
                    options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                />
            </form>,
        );

        const form = screen.getByRole('form', {
            name: 'Record status filters',
        }) as HTMLFormElement;
        const active = screen.getByRole('checkbox', { name: 'Active' });
        const inactive = screen.getByRole('checkbox', { name: 'Inactive' });

        expect(active).toBeChecked();
        expect(inactive).not.toBeChecked();
        expect(new FormData(form).getAll('record_status[]')).toEqual([
            'active',
        ]);

        await user.click(inactive);
        expect(new FormData(form).getAll('record_status[]')).toEqual([
            'active',
            'inactive',
        ]);
    });

    it('uses a select for options between six and ten', () => {
        render(
            <AdaptiveSelect
                aria-label="Status"
                options={Array.from({ length: 6 }, (_, index) => ({
                    value: String(index),
                    label: `Option ${index}`,
                }))}
            />,
        );

        expect(
            screen.getByRole('combobox', { name: 'Status' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('adds search for more than ten options', async () => {
        const user = userEvent.setup();

        render(
            <AdaptiveSelect
                aria-label="Country"
                options={Array.from({ length: 11 }, (_, index) => ({
                    value: String(index),
                    label: `Country ${index}`,
                }))}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Country' }));

        const searchInput = screen.getByRole('textbox', {
            name: 'Search options',
        });
        await user.type(searchInput, 'Country 10');

        expect(screen.getByText('Country 10')).toBeInTheDocument();
        expect(screen.queryByText('Country 1')).not.toBeInTheDocument();
    });

    it('supports optional multiple selection with repeated form values', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        const { container } = render(
            <AdaptiveSelect
                name="roles"
                multiple
                aria-label="Roles"
                options={Array.from({ length: 6 }, (_, index) => ({
                    value: String(index),
                    label: `Role ${index}`,
                }))}
                onValueChange={onValueChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Roles' }));
        await user.click(screen.getByText('Role 1'));
        await user.click(screen.getByText('Role 3'));

        expect(onValueChange).toHaveBeenLastCalledWith(['1', '3']);
        expect(
            Array.from(container.querySelectorAll('input[name="roles[]"]')).map(
                (input) => input.getAttribute('value'),
            ),
        ).toEqual(['1', '3']);
    });

    it('infers multiple selection when the initial value is an array', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(
            <AdaptiveSelect
                aria-label="Status"
                defaultValue={['one']}
                options={options}
                onValueChange={onValueChange}
            />,
        );

        await user.click(screen.getByText('Two'));

        expect(onValueChange).toHaveBeenCalledWith(['one', 'two']);
    });
});
