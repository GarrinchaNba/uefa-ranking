import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('frontend test setup', () => {
  it('renders accessible React content', () => {
    render(<h1>UEFA Club Rankings</h1>);
    expect(screen.getByRole('heading', { name: 'UEFA Club Rankings' })).toBeVisible();
  });
});
