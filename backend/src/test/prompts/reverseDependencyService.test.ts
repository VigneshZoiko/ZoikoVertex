import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the shared supabase client with the in-memory fixture-backed mock.
// Both '../../shared/supabase' (here) and '../../../shared/supabase' (service)
// resolve to the same module id, so this mock applies to the service too.
vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { ReverseDependencyService } from '../../modules/prompts/services/ReverseDependencyService';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

beforeEach(() => resetFixtures());

describe('ReverseDependencyService — tenant isolation & traversal', () => {
  it('returns only same-workspace dependents for a shared agent id', async () => {
    setFixtures({
      prompts: [
        { id: 'p1', workspace_id: WS_A, name: 'P1', status: 'production_active', current_version_id: 'v1' },
        { id: 'p2', workspace_id: WS_B, name: 'P2', status: 'production_active', current_version_id: 'v2' },
      ],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', version_number: 1 },
        { id: 'v2', prompt_id: 'p2', version_number: 1 },
      ],
      prompt_bindings: [
        { prompt_version_id: 'v1', agent_id: 'agentX', environment: 'production' },
        { prompt_version_id: 'v2', agent_id: 'agentX', environment: 'production' },
      ],
    });

    const res = await ReverseDependencyService.getDependents('agent', 'agentX', WS_A);
    expect(res.dependents).toHaveLength(1);
    expect(res.dependents[0].prompt_id).toBe('p1');
    expect(res.dependents[0].is_current_version).toBe(true);
    expect(res.dependents[0].dependency_type).toBe('agent');
    expect(res.summary).toEqual({ prompt_count: 1, version_count: 1, binding_count: 1 });
  });

  it('does NOT leak cross-tenant prompts (foreign-only target → empty)', async () => {
    setFixtures({
      prompts: [{ id: 'p2', workspace_id: WS_B, name: 'P2', status: 'active', current_version_id: 'v2' }],
      prompt_versions: [{ id: 'v2', prompt_id: 'p2', version_number: 1 }],
      prompt_bindings: [{ prompt_version_id: 'v2', agent_id: 'agentX', environment: 'production' }],
    });
    const res = await ReverseDependencyService.getDependents('agent', 'agentX', WS_A);
    expect(res.dependents).toHaveLength(0);
    expect(res.summary.prompt_count).toBe(0);
  });

  it('tool lookup matches tool_id first and falls back to tool_name only when tool_id is null', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS_A, name: 'P1', status: 'active', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
      prompt_tool_permissions: [
        { prompt_version_id: 'v1', tool_id: 'toolA', tool_name: 'Alpha' },
        { prompt_version_id: 'v1', tool_id: null, tool_name: 'namedTool' },
      ],
    });

    const byId = await ReverseDependencyService.getDependents('tool', 'toolA', WS_A);
    expect(byId.summary.binding_count).toBe(1);

    const byName = await ReverseDependencyService.getDependents('tool', 'namedTool', WS_A);
    expect(byName.summary.binding_count).toBe(1);

    // 'Alpha' has a non-null tool_id, so it must NOT match by name (tool_id-first rule).
    const byNameWithId = await ReverseDependencyService.getDependents('tool', 'Alpha', WS_A);
    expect(byNameWithId.summary.binding_count).toBe(0);
  });

  it('resolves policy via runtime_policy_id', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS_A, name: 'P1', status: 'active', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
      prompt_tool_permissions: [{ prompt_version_id: 'v1', tool_id: 't', tool_name: 'x', runtime_policy_id: 'polA' }],
    });
    const res = await ReverseDependencyService.getPromptsByPolicy('polA', WS_A);
    expect(res.dependents).toHaveLength(1);
    expect(res.dependents[0].dependency_type).toBe('policy');
  });

  it('resolves knowledge (kb_id) bindings', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS_A, name: 'P1', status: 'active', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
      prompt_knowledge_bindings: [{ prompt_version_id: 'v1', kb_id: 'kbA' }],
    });
    const res = await ReverseDependencyService.getPromptsByKnowledge('kbA', WS_A);
    expect(res.dependents).toHaveLength(1);
    expect(res.dependents[0].environment).toBeNull();
  });

  it('returns an empty, zeroed result for an unknown target', async () => {
    setFixtures({ prompts: [], prompt_versions: [], prompt_bindings: [] });
    const res = await ReverseDependencyService.getDependents('agent', 'nope', WS_A);
    expect(res.dependents).toHaveLength(0);
    expect(res.summary).toEqual({ prompt_count: 0, version_count: 0, binding_count: 0 });
  });
});
