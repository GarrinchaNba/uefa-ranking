import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RankMovement } from '../src/components/RankMovement.js';

afterEach(cleanup);

describe('rank movement presentation', () => {
  it('labels rises, falls, and unchanged positions without relying on color', () => {
    const { rerender } = render(<RankMovement movement={2} />);
    expect(screen.getByText('+2')).toHaveAccessibleName('Up 2 places');
    expect(screen.getByText('+2')).toHaveClass('movement-up');

    rerender(<RankMovement movement={-1} />);
    expect(screen.getByText('-1')).toHaveAccessibleName('Down 1 place');
    expect(screen.getByText('-1')).toHaveClass('movement-down');

    rerender(<RankMovement movement={0} />);
    expect(screen.getByText('0')).toHaveAccessibleName('Unchanged');
  });

  it('provides an accessible non-color unavailable state', () => {
    render(<RankMovement movement={null} />);
    expect(screen.getByText('Unavailable')).toHaveAccessibleName('Movement unavailable');
  });
});
