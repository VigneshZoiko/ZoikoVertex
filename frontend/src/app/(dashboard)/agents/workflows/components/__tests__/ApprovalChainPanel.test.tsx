import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApprovalChainPanel from '../ApprovalChainPanel';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getThreeKeyChain: vi.fn(),
    getThreeKeyQuorum: vi.fn(),
  },
}));

describe('ApprovalChainPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no versionId', () => {
    render(<ApprovalChainPanel versionId={null} />);
    expect(screen.getByText(/no three-key approval chain configured/i)).toBeDefined();
  });

  it('renders loading state when versionId provided', () => {
    render(<ApprovalChainPanel versionId="ver-1" />);
    expect(screen.getByText(/loading approval chain/i)).toBeDefined();
  });
});
