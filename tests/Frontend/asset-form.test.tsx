import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const formState = vi.hoisted(() => ({
    data: {
        code: '',
        name: '',
        category: '',
        condition: 'operational',
        latitude: '',
        longitude: '',
    },
    errors: {} as Record<string, string>,
    processing: false,
    transform: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    setData: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ useForm: () => formState }));
vi.mock('@/components/action-link', () => ({
    ActionLink: ({ children, href }: { children: ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

import { AssetForm } from '@/features/assets/components/asset-form';

describe('asset form', () => {
    beforeEach(() => {
        formState.data = {
            code: ' pump-01 ',
            name: 'North Pump',
            category: 'Pump',
            condition: 'operational',
            latitude: '12.5',
            longitude: '121.5',
        };
        formState.errors = {};
        formState.processing = false;
        formState.transform.mockClear();
        formState.post.mockClear();
        formState.patch.mockClear();
        formState.setData.mockClear();
    });

    it('keeps labeled manual coordinates available with a helpful map fallback', async () => {
        render(
            <AssetForm
                action="/assets"
                method="post"
                submitLabel="Create asset"
                cancelHref="/assets"
            />,
        );

        expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
        expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
        expect(screen.getByLabelText('Asset code')).toHaveAttribute(
            'maxLength',
            '32',
        );
        expect(screen.getByLabelText('Category')).toHaveAttribute(
            'maxLength',
            '80',
        );
        await waitFor(() => {
            const fallback = screen.queryByRole('status');
            const map = screen.queryByRole('region', {
                name: 'Map for selecting asset coordinates',
            });

            expect(fallback || map).toBeTruthy();

            if (fallback) {
                expect(fallback).toHaveTextContent(
                    /Coordinates remain fully editable below|enter and save coordinates below/i,
                );
            }
        });
        expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
        expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    });

    it('renders backend validation messages beside their fields', () => {
        formState.errors = {
            code: 'The code has already been taken.',
            coordinates: 'Both coordinates must be supplied together.',
        };

        render(
            <AssetForm
                action="/assets"
                method="post"
                submitLabel="Create asset"
                cancelHref="/assets"
            />,
        );

        expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
            'The code has already been taken.',
        );
        expect(screen.getByText('Both coordinates must be supplied together.'))
            .toBeInTheDocument();
        expect(screen.getByLabelText('Asset code')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('submits normalized fields through the Inertia form action', async () => {
        const user = userEvent.setup();
        let transformCallback:
            | ((data: typeof formState.data) => Record<string, unknown>)
            | undefined;
        formState.transform.mockImplementation((callback) => {
            transformCallback = callback;
        });
        render(
            <AssetForm
                action="/assets"
                method="post"
                submitLabel="Create asset"
                cancelHref="/assets"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Create asset' }));

        expect(formState.transform).toHaveBeenCalledOnce();
        expect(transformCallback?.({
            code: ' pump-01 ',
            name: 'North Pump',
            category: 'Pump',
            condition: 'operational',
            latitude: '12.5',
            longitude: '121.5',
        })).toEqual({
            code: 'PUMP-01',
            name: 'North Pump',
            category: 'Pump',
            condition: 'operational',
            latitude: 12.5,
            longitude: 121.5,
        });
        expect(formState.post).toHaveBeenCalledWith('/assets');
    });
});
