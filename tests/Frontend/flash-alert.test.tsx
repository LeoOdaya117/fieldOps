import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    usePage: usePageMock,
}));

import { FlashAlert } from '@/components/flash-alert';

afterEach(() => {
    cleanup();
    usePageMock.mockReset();
});

describe('FlashAlert', () => {
    it('renders a success flash message', () => {
        usePageMock.mockReturnValue({
            props: {
                flash: { success: 'Role updated.' },
                errors: {},
            },
        });

        render(<FlashAlert />);

        expect(screen.getByRole('alert')).toHaveTextContent('Role updated.');
        expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('renders validation errors and allows the alert to be dismissed', async () => {
        const user = userEvent.setup();
        usePageMock.mockReturnValue({
            props: {
                flash: {},
                errors: {
                    name: 'The name field is required.',
                    permissions: 'Choose at least one permission.',
                },
            },
        });

        render(<FlashAlert />);

        expect(
            screen.getByText('The name field is required.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Choose at least one permission.'),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Dismiss alert' }));

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
