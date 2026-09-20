import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
        href: string;
        children?: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

import SearchFilterSheet from '@/components/search-filter-sheet';

describe('SearchFilterSheet', () => {
    it('opens a right-side filter panel with apply and reset actions', async () => {
        const user = userEvent.setup();
        render(
            <SearchFilterSheet
                action="/access/roles"
                resetHref="/access/roles"
                title="Search and filter roles"
                description="Find a role."
                activeFilterCount={2}
                keyword={
                    <>
                        <label htmlFor="role-search">Search roles</label>
                        <input id="role-search" name="search" />
                    </>
                }
                dateRange={<label htmlFor="date-range">Date range</label>}
            />,
        );

        expect(
            screen.getByRole('button', { name: /Filter 2/ }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Filter 2/ }));

        expect(
            screen.getByRole('heading', {
                name: 'Search and filter roles',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Apply filters' }),
        ).toBeInTheDocument();
        const form = screen
            .getByRole('button', { name: 'Apply filters' })
            .closest('form');

        expect(
            Array.from(form?.querySelectorAll('label') ?? []).map(
                (label) => label.textContent,
            ),
        ).toEqual(['Search roles', 'Date range', 'Rows per page']);
        expect(screen.getByRole('link', { name: 'Reset' })).toHaveAttribute(
            'href',
            '/access/roles',
        );
        const pageSizeSelect = screen.getByRole('combobox', {
            name: 'Rows per page',
        });

        expect(pageSizeSelect).toHaveTextContent('50');
        await user.click(pageSizeSelect);
        expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
    });
});
