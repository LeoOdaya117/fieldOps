import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormSelect } from '@/components/ui/form-select';

describe('FormSelect', () => {
    it('renders a shadcn select and keeps the selected value in form data', async () => {
        const user = userEvent.setup();

        render(
            <form>
                <label htmlFor="status">Status</label>
                <FormSelect
                    id="status"
                    name="status"
                    defaultValue=""
                    options={[
                        { value: '', label: 'All statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'blocked', label: 'Blocked' },
                    ]}
                />
            </form>,
        );

        const select = screen.getByRole('combobox', { name: 'Status' });

        expect(select).toHaveTextContent('All statuses');
        expect(
            screen.queryByRole('option', { name: 'Active' }),
        ).not.toBeInTheDocument();

        await user.click(select);
        await user.click(screen.getByRole('option', { name: 'Blocked' }));

        expect(select).toHaveTextContent('Blocked');
        expect(screen.getByDisplayValue('blocked')).toHaveAttribute(
            'name',
            'status',
        );
    });
});
