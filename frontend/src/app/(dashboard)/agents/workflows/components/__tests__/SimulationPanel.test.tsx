import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SimulationPanel from '../SimulationPanel';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getWorkflowSimulations: vi.fn(),
    simulateWorkflowVersion: vi.fn(),
  },
}));

describe('SimulationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no versionId', () => {
    render(<SimulationPanel versionId={null} />);
    expect(screen.getByText(/no simulations yet/i)).toBeDefined();
  });

  it('renders loading state when versionId provided', () => {
    render(<SimulationPanel versionId="ver-1" />);
    expect(screen.getByText(/loading simulations/i)).toBeDefined();
  });

  it('renders pass result from simulation data', async () => {
    (api.getWorkflowSimulations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [{ id: 'sim-1', result: 'pass', warnings: [], blocks: [], failed_steps: [], missing_dependencies: [], policy_results: [], dependency_results: [], evidence_ref: 'abc' }],
    });
    render(<SimulationPanel versionId="ver-1" />);
    const pass = await screen.findByText(/^Result:\s*pass$/);
    expect(pass).toBeDefined();
  });

  it('renders block result from simulation data', async () => {
    (api.getWorkflowSimulations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [{ id: 'sim-2', result: 'block', warnings: [], blocks: [{ type: 'missing_trigger', message: 'No trigger step' }], failed_steps: [], missing_dependencies: [], policy_results: [], dependency_results: [], evidence_ref: 'def' }],
    });
    render(<SimulationPanel versionId="ver-1" />);
    const header = await screen.findByText('Blocks');
    expect(header).toBeDefined();
  });
});
