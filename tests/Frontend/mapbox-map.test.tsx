import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapboxMap } from '@/components/mapbox-map';

describe('MapboxMap', () => {
    it('keeps an accessible setup state when no public token is configured', () => {
        render(<MapboxMap value={null} onChange={() => undefined} />);

        expect(screen.getByRole('status')).toHaveTextContent('Mapbox is ready for a public token');
        expect(screen.getByRole('status')).toHaveTextContent('Coordinates remain fully editable below');
    });
});
