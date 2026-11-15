import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DataStatus } from '../src/components/DataStatus.js';

afterEach(cleanup);

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

  it('distinguishes all live quality states and preserves the machine-readable update time', () => {
    const { rerender } = render(<DataStatus dataStatus={{
      mode: 'live',
      quality: 'current',
      source: 'UEFA API',
      lastSuccessfulUpdate: '2026-11-06T12:00:00.000Z',
    }} />);
    expect(screen.getByRole('time')).toHaveAttribute('dateTime', '2026-11-06T12:00:00.000Z');

    for (const [quality, label] of [
      ['current', 'Current'],
      ['stale', 'Stale'],
      ['partial', 'Partial data'],
      ['unavailable', 'Unavailable'],
    ] as const) {
      rerender(<DataStatus dataStatus={{
        mode: 'live', quality, source: 'UEFA API', lastSuccessfulUpdate: null,
      }} />);
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.getByText('Live data')).toBeVisible();
    expect(screen.getByText('UEFA API')).toBeVisible();
    expect(screen.queryByRole('time')).not.toBeInTheDocument();
  });
});
