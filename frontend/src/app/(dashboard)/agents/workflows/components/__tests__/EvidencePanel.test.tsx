import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EvidencePanel from '../EvidencePanel';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    getWorkflowEvidence: vi.fn(),
    exportWorkflow: vi.fn(),
    exportApprovalsCsv: vi.fn(),
    exportWorkflowPdfReady: vi.fn(),
    exportRuntimeTimeline: vi.fn(),
  },
}));

describe('EvidencePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: null });
    (api.getWorkflowEvidence as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: null });
  });

  it('shows loading state initially', () => {
    render(<EvidencePanel instanceId="inst-1" />);
    expect(screen.getByText(/loading evidence/i)).toBeDefined();
  });

  it('shows no evidence when api returns null', async () => {
    render(<EvidencePanel instanceId="inst-1" />);
    const empty = await screen.findByText(/no evidence bundles found/i);
    expect(empty).toBeDefined();
  });

  it('calls api.getWorkflowEvidence once', async () => {
    const getEvidence = api.getWorkflowEvidence as ReturnType<typeof vi.fn>;
    render(<EvidencePanel instanceId="inst-1" />);
    await screen.findByText(/no evidence bundles found/i);
    expect(getEvidence).toHaveBeenCalledTimes(1);
  });
});
