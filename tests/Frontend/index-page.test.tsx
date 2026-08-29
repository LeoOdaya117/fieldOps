import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => (
        <div data-testid="head-title">{title}</div>
    ),
}));

import { IndexPage, IndexPageSection } from '@/components/index-page';

describe('IndexPage', () => {
    it('provides a shared page shell and card section for index content', () => {
        render(
            <IndexPage
                title="Roles"
                description="Manage roles"
                actions={<button type="button">Create role</button>}
            >
                <IndexPageSection toolbar={<span>2 visible</span>}>
                    <div>Role table</div>
                </IndexPageSection>
            </IndexPage>,
        );

        expect(screen.getByTestId('head-title')).toHaveTextContent('Roles');
        expect(
            screen.getByRole('heading', { name: 'Roles' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Manage roles')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create role' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Role table')).toBeInTheDocument();
        expect(screen.getByText('2 visible')).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="index-page"]'),
        ).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="index-page-toolbar"]'),
        ).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="card"]'),
        ).toBeInTheDocument();
    });
});
