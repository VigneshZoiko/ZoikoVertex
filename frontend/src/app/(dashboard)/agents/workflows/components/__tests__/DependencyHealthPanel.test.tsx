import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import DependencyHealthPanel from '../DependencyHealthPanel';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getWorkflowDependencies: vi.fn(),
  },
}));

describe('DependencyHealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no workflowId', () => {
    render(<DependencyHealthPanel workflowId={null} />);
    expect(screen.getByText(/no dependencies found/i)).toBeDefined();
  });

  it('renders loading state when workflowId provided', () => {
    render(<DependencyHealthPanel workflowId="wf-1" />);
    expect(screen.getByText(/loading dependencies/i)).toBeDefined();
  });

  it('renders critical_failure dependency', async () => {
    (api.getWorkflowDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [{ dependency_type: 'agent', dependency_id_ref: 'ag-1', dependency_name: 'Critical Agent', required_status: 'active', current_status: 'error', health: 'critical_failure', impact_level: 'high', blocking: true, recommended_action: 'Restart agent' }],
    });
    render(<DependencyHealthPanel workflowId="wf-1" />);
    const critical = await screen.findByText('Critical');
    expect(critical).toBeDefined();
  });
});
