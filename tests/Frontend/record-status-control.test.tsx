import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const routerPatch = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({
    router: { patch: routerPatch },
}));

import { RecordStatusControl } from '@/components/ui/record-status-control';
import { RecordStatusFilters } from '@/components/record-status-filters';

describe('record status control', () => {
    it('renders a status badge when the user cannot change status', () => {
        render(<RecordStatusControl recordStatus={0} label="Example" />);

        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it.each([
        [1, 0, 'Deactivate Example?', 'Inactive'],
        [0, 1, 'Activate Example?', 'Active'],
    ])(
        'confirms then patches status %s to %s',
        async (current, next, title, buttonLabel) => {
            routerPatch.mockClear();
            const user = userEvent.setup();
            render(
                <RecordStatusControl
                    recordStatus={Number(current)}
                    label="Example"
                    canUpdateDeleted
                    recordStatusUrl="/records/1/status"
                />,
            );

            await user.click(screen.getByRole('switch'));
            expect(screen.getByText(title)).toBeInTheDocument();
            expect(routerPatch).not.toHaveBeenCalled();
            await user.click(screen.getByRole('button', { name: buttonLabel }));

            expect(routerPatch).toHaveBeenCalledWith(
                '/records/1/status',
                { record_status: Number(next) },
                expect.objectContaining({ preserveScroll: true }),
            );
        },
    );

    it('shows a server error while retaining the current status after failure', async () => {
        routerPatch.mockImplementation((_url, _data, options) =>
            options.onError(),
        );
        const user = userEvent.setup();
        render(
            <RecordStatusControl
                recordStatus={1}
                label="Example"
                canUpdateDeleted
                recordStatusUrl="/records/1/status"
            />,
        );

        await user.click(screen.getByRole('switch'));
        await user.click(screen.getByRole('button', { name: 'Inactive' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not update Example status',
        );
        expect(screen.getByRole('switch')).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });
});

describe('record status filters', () => {
    it('omits filter controls without visibility permission', () => {
        const { container } = render(
            <RecordStatusFilters canViewDeleted={false} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('defaults to Active and submits the selected values as an array', () => {
        render(<RecordStatusFilters canViewDeleted />);

        const active = screen.getByRole('checkbox', { name: 'Active' });
        const inactive = screen.getByRole('checkbox', { name: 'Inactive' });
        expect(active).toBeChecked();
        expect(inactive).not.toBeChecked();
        expect(active).toHaveAttribute('name', 'record_status[]');
        expect(inactive).toHaveAttribute('name', 'record_status[]');
        expect(active).toHaveProperty('value', 'active');
        expect(inactive).toHaveProperty('value', 'inactive');
    });

    it('restores the server-selected inactive filter after navigation', () => {
        render(<RecordStatusFilters canViewDeleted value="inactive" />);

        expect(
            screen.getByRole('checkbox', { name: 'Active' }),
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: 'Inactive' }),
        ).toBeChecked();
    });
});
