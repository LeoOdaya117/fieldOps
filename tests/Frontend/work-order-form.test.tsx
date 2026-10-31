import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const formState = vi.hoisted(() => ({
    data: {
        reference: '',
        title: '',
        instructions: '',
        priority: 'normal',
        due_date: '',
        asset_id: '',
        location_label: '',
        latitude: '',
        longitude: '',
        version: undefined as number | undefined,
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
vi.mock('@/components/mapbox-map', () => ({
    default: () => (
        <div role="status">Map unavailable. Enter coordinates below.</div>
    ),
}));

import { WorkOrderForm } from '@/features/work-orders/components/work-order-form';
import type {
    WorkOrder,
    WorkOrderAssetOption,
} from '@/features/work-orders/types';

const workOrder: WorkOrder = {
    id: 4,
    reference: 'WO-0004',
    title: 'Pump inspection',
    instructions: 'Check seal',
    priority: 'high',
    dueDate: '2026-11-01',
    assetId: 8,
    asset: { id: 8, code: 'PUMP-8', name: 'North pump' },
    locationLabel: null,
    latitude: 12.5,
    longitude: 121.5,
    status: 'open',
    recordStatus: 1,
    version: 3,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
    cancelUrl: '/work-orders/4/cancel',
    recordStatusUrl: '/work-orders/4/record-status',
};

describe('work order form', () => {
    beforeEach(() => {
        formState.data = {
            reference: '',
            title: '',
            instructions: '',
            priority: 'normal',
            due_date: '',
            asset_id: '',
            location_label: '',
            latitude: '',
            longitude: '',
            version: undefined,
        };
        formState.errors = {};
        formState.processing = false;
        formState.transform.mockClear();
        formState.post.mockClear();
        formState.patch.mockClear();
        formState.setData.mockClear();
    });

    it('keeps manual coordinates usable when the map is unavailable', async () => {
        render(
            <WorkOrderForm
                assets={[]}
                action="/work-orders"
                method="post"
                submitLabel="Create work order"
                cancelHref="/work-orders"
            />,
        );

        expect(screen.getByLabelText('Work-order reference')).toBeRequired();
        expect(screen.getByLabelText('Work-order reference')).toHaveAttribute(
            'maxLength',
            '32',
        );
        expect(screen.getByLabelText('Standalone location')).toBeRequired();
        expect(screen.getByLabelText('Latitude')).toBeRequired();
        expect(screen.getByLabelText('Longitude')).toBeRequired();
        expect(await screen.findByText(/map unavailable/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Latitude')).not.toHaveAttribute(
            'readonly',
        );
        fireEvent.change(screen.getByLabelText('Latitude'), {
            target: { value: '12.5' },
        });
        expect(formState.setData).toHaveBeenCalledWith('latitude', '12.5');
        expect(
            screen.queryByLabelText(/work status|record status/i),
        ).not.toBeInTheDocument();

        formState.data.reference = ' wo-new ';
        fireEvent.submit(
            screen
                .getByRole('button', { name: 'Create work order' })
                .closest('form')!,
        );
        const createTransform = formState.transform.mock.calls[0]?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        const createPayload = createTransform(formState.data);
        expect(createPayload).toHaveProperty('reference', 'WO-NEW');
        expect(createPayload).not.toHaveProperty('version');
    });

    it('keeps the reference immutable and shows the stored coordinate snapshot when editing', () => {
        const assets: WorkOrderAssetOption[] = [
            {
                id: 8,
                code: 'PUMP-8',
                name: 'North pump',
                latitude: 13,
                longitude: 122,
            },
        ];
        formState.data = {
            reference: workOrder.reference,
            title: workOrder.title,
            instructions: workOrder.instructions,
            priority: workOrder.priority,
            due_date: workOrder.dueDate,
            asset_id: '8',
            location_label: '',
            latitude: '12.5',
            longitude: '121.5',
            version: workOrder.version,
        };

        render(
            <WorkOrderForm
                workOrder={workOrder}
                assets={assets}
                action="/work-orders/4"
                method="patch"
                submitLabel="Save changes"
                cancelHref="/work-orders"
            />,
        );

        expect(
            screen.queryByLabelText('Work-order reference'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('WO-0004')).toBeInTheDocument();
        expect(screen.getByLabelText('Latitude')).toHaveValue(12.5);
        expect(screen.getByLabelText('Longitude')).toHaveValue(121.5);
        expect(screen.getByLabelText('Latitude')).toHaveAttribute('readonly');
        expect(screen.getByRole('status')).toHaveTextContent(
            /location snapshot/i,
        );

        fireEvent.submit(
            screen
                .getByRole('button', { name: 'Save changes' })
                .closest('form')!,
        );
        const transform = formState.transform.mock.calls.at(-1)?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        const payload = transform({
            ...formState.data,
            version: workOrder.version,
        });
        expect(payload).not.toHaveProperty('reference');
        expect(payload).toHaveProperty('version', workOrder.version);
    });

    it('renders server validation errors beside the affected fields', () => {
        formState.errors = {
            title: 'A title is required.',
            coordinates: 'Enter latitude and longitude together.',
        };

        render(
            <WorkOrderForm
                assets={[]}
                action="/work-orders"
                method="post"
                submitLabel="Create work order"
                cancelHref="/work-orders"
            />,
        );

        expect(screen.getByText('A title is required.')).toBeInTheDocument();
        expect(
            screen.getByText('Enter latitude and longitude together.'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Title')).toHaveAttribute(
            'aria-invalid',
            'true',
        );

        for (const label of ['Latitude', 'Longitude']) {
            const coordinateInput = screen.getByLabelText(label);
            expect(coordinateInput).toHaveAttribute('aria-invalid', 'true');
            expect(coordinateInput.getAttribute('aria-describedby')).toContain(
                'work-order-coordinate-pair-error',
            );
        }
    });
});
