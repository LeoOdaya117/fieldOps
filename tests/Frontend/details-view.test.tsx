import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailsView } from '@/components/details-view';

type ExampleRecord = {
    name: string;
    count: number;
    empty: string | null;
};

const record: ExampleRecord = {
    name: 'Regional manager',
    count: 3,
    empty: null,
};

describe('DetailsView', () => {
    it('renders declarative fields, custom cells, empty values, and rich content', () => {
        render(
            <DetailsView
                record={record}
                summary={<p>Record summary</p>}
                sections={[
                    {
                        key: 'definition',
                        title: 'Definition',
                        description: 'Core record values.',
                        columns: [
                            {
                                key: 'name',
                                label: 'Name',
                                accessor: 'name',
                            },
                            {
                                key: 'count',
                                label: 'Count',
                                accessor: (value) => value.count,
                            },
                            {
                                key: 'custom',
                                label: 'Custom value',
                                accessor: 'name',
                                cell: () => 'Rendered by cell',
                                span: 'full',
                            },
                            {
                                key: 'empty',
                                label: 'Empty value',
                                accessor: 'empty',
                            },
                        ],
                    },
                    {
                        key: 'rich',
                        title: 'Rich content',
                        content: <p>Additional context</p>,
                    },
                ]}
            />,
        );

        const view = document.querySelector('[data-slot="details-view"]');

        expect(view).toBeInTheDocument();
        expect(view?.querySelectorAll('[data-slot="card"]')).toHaveLength(0);
        expect(screen.getByText('Record summary')).toBeInTheDocument();
        expect(screen.getByText('Regional manager')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Rendered by cell')).toBeInTheDocument();
        expect(screen.getByText('Not recorded')).toBeInTheDocument();
        expect(screen.getByText('Additional context')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Definition' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Rich content' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('term')).toHaveLength(4);
        expect(screen.getAllByRole('definition')).toHaveLength(4);
    });
});
