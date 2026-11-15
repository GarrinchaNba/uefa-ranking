import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataStatus } from '../src/components/DataStatus.js';

describe('data status presentation', () => {
  it('labels mock data without presenting fixture time as a live update', () => {
    render(
      <DataStatus
        dataStatus={{
          mode: 'mock',
          quality: 'current',
          source: 'Deterministic fixture',
          lastSuccessfulUpdate: '2026-11-06T12:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText('Mock data')).toBeVisible();
    expect(screen.getByText('Deterministic fixture')).toBeVisible();
    expect(screen.queryByText(/Last successful update/)).not.toBeInTheDocument();
  });

  it('shows live source freshness, loading, and errors explicitly', () => {
    const { rerender } = render(<DataStatus loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading ranking data');

    rerender(
      <DataStatus
        dataStatus={{
          mode: 'live',
          quality: 'stale',
          source: 'Provider API',
          lastSuccessfulUpdate: '2026-11-06T12:00:00.000Z',
        }}
      />,
    );
    expect(screen.getByText('Live data')).toBeVisible();
    expect(screen.getByText('Stale')).toBeVisible();
    expect(screen.getByText(/Last successful update/)).toBeVisible();

    rerender(<DataStatus error="The provider is unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent('The provider is unavailable');
  });
});
