import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TraderOnboardingModal } from './TraderOnboardingModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => {
    const { initial, animate, exit, ...rest } = props;
    return <div {...rest}>{children}</div>;
  } }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const KEY = 'kaspump_onboarded_v1';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('TraderOnboardingModal', () => {
  it('shows on first visit (no stored flag) as an accessible dialog', () => {
    render(<TraderOnboardingModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(/bonding curve/i);
  });

  it('does not show once the flag is set', () => {
    localStorage.setItem(KEY, '1');
    render(<TraderOnboardingModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('walks through the steps and marks onboarding done on finish', async () => {
    const user = userEvent.setup();
    render(<TraderOnboardingModal />);

    // Step 1 → Next → Step 2 → Next → Step 3 → "Start trading"
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/anti-sniper/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start trading/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('Skip closes immediately and records the flag', async () => {
    const user = userEvent.setup();
    render(<TraderOnboardingModal />);
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('forceOpen shows even when the flag is set', () => {
    localStorage.setItem(KEY, '1');
    render(<TraderOnboardingModal forceOpen />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
