import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    it('opens a right-side filter panel with apply and reset actions', () => {
        render(
            <SearchFilterSheet
                action="/access/roles"
                resetHref="/access/roles"
                title="Search and filter roles"
                description="Find a role."
                activeFilterCount={2}
            >
                <label htmlFor="role-search">Search roles</label>
                <input id="role-search" name="search" />
            </SearchFilterSheet>,
        );

        expect(
            screen.getByRole('button', { name: /Search & filter 2/ }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: /Search & filter 2/ }),
        );

        expect(
            screen.getByRole('heading', {
                name: 'Search and filter roles',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Apply filters' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Reset' })).toHaveAttribute(
            'href',
            '/access/roles',
        );
    });
});
