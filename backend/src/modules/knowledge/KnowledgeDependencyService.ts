import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export interface SourceDependencies {
  source_id: string;
  agents: Array<{ agent_id: string; agent_name: string }>;
  prompts: Array<{ prompt_id: string; prompt_name: string }>;
  workflows: Array<{ workflow_id: string; workflow_name: string }>;
  policies: Array<{ policy_id: string; policy_name: string }>;
}

export class KnowledgeDependencyService {
  static async getSourceDependencies(sourceId: string): Promise<SourceDependencies> {
    const [agents, prompts, workflows, policies] = await Promise.all([
      this.getDependentAgents(sourceId),
      this.getDependentPrompts(sourceId),
      this.getDependentWorkflows(sourceId),
      this.getDependentPolicies(sourceId),
    ]);

    return { source_id: sourceId, agents, prompts, workflows, policies };
  }

  static async getCollectionDependencies(collectionId: string): Promise<{
    collection_id: string;
    source_count: number;
    agents: Array<{ agent_id: string; agent_name: string }>;
    prompts: Array<{ prompt_id: string; prompt_name: string }>;
    workflows: Array<{ workflow_id: string; workflow_name: string }>;
  }> {
    const { data: sources } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id')
      .eq('collection_id', collectionId);

    const sourceIds = (sources || []).map((s: any) => s.id);

    const [agents, prompts, workflows] = await Promise.all([
      sourceIds.length > 0 ? this.getDependentAgentsForSources(sourceIds) : Promise.resolve([]),
      sourceIds.length > 0 ? this.getDependentPromptsForSources(sourceIds) : Promise.resolve([]),
      sourceIds.length > 0 ? this.getDependentWorkflowsForSources(sourceIds) : Promise.resolve([]),
    ]);

    return {
      collection_id: collectionId,
      source_count: sourceIds.length,
      agents,
      prompts,
      workflows,
    };
  }

  private static async getDependentAgents(sourceId: string): Promise<Array<{ agent_id: string; agent_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('knowledge_access_policies')
        .select('collection_id')
        .eq('source_id', sourceId)
        .limit(1);
      if (!data || data.length === 0) return [];

      const collectionId = data[0].collection_id;
      const { data: agents } = await supabaseAdmin
        .from('agents')
        .select('agent_id, agent_name')
        .contains('allowed_collections', [collectionId])
        .limit(20);

      return (agents || []).map((a: any) => ({ agent_id: a.agent_id, agent_name: a.agent_name }));
    } catch (error) {
      logger.warn({ error, sourceId }, 'Failed to fetch dependent agents');
      return [];
    }
  }

  private static async getDependentPrompts(sourceId: string): Promise<Array<{ prompt_id: string; prompt_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('prompt_knowledge_mappings')
        .select('prompt_id, prompt_name')
        .eq('source_id', sourceId)
        .limit(20);
      return (data || []);
    } catch (error) {
      logger.warn({ error, sourceId }, 'Failed to fetch dependent prompts');
      return [];
    }
  }

  private static async getDependentWorkflows(sourceId: string): Promise<Array<{ workflow_id: string; workflow_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('workflow_knowledge_mappings')
        .select('workflow_id, workflow_name')
        .eq('source_id', sourceId)
        .limit(20);
      return (data || []);
    } catch (error) {
      logger.warn({ error, sourceId }, 'Failed to fetch dependent workflows');
      return [];
    }
  }

  private static async getDependentPolicies(sourceId: string): Promise<Array<{ policy_id: string; policy_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('policy_knowledge_mappings')
        .select('policy_id, policy_name')
        .eq('source_id', sourceId)
        .limit(20);
      return (data || []);
    } catch (error) {
      logger.warn({ error, sourceId }, 'Failed to fetch dependent policies');
      return [];
    }
  }

  private static async getDependentAgentsForSources(sourceIds: string[]): Promise<Array<{ agent_id: string; agent_name: string }>> {
    try {
      const { data: policies } = await supabaseAdmin
        .from('knowledge_access_policies')
        .select('collection_id')
        .in('source_id', sourceIds)
        .limit(10);

      if (!policies || policies.length === 0) return [];
      const collectionIds = [...new Set(policies.map((p: any) => p.collection_id).filter(Boolean))];
      if (collectionIds.length === 0) return [];

      const { data: agents } = await supabaseAdmin
        .from('agents')
        .select('agent_id, agent_name')
        .overlaps('allowed_collections', collectionIds)
        .limit(20);

      return (agents || []).map((a: any) => ({ agent_id: a.agent_id, agent_name: a.agent_name }));
    } catch (error) {
      logger.warn({ error, sourceIds: sourceIds.length }, 'Failed to fetch dependent agents for sources');
      return [];
    }
  }

  private static async getDependentPromptsForSources(sourceIds: string[]): Promise<Array<{ prompt_id: string; prompt_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('prompt_knowledge_mappings')
        .select('prompt_id, prompt_name')
        .in('source_id', sourceIds)
        .limit(20);
      return (data || []);
    } catch (error) {
      return [];
    }
  }

  private static async getDependentWorkflowsForSources(sourceIds: string[]): Promise<Array<{ workflow_id: string; workflow_name: string }>> {
    try {
      const { data } = await supabaseAdmin
        .from('workflow_knowledge_mappings')
        .select('workflow_id, workflow_name')
        .in('source_id', sourceIds)
        .limit(20);
      return (data || []);
    } catch (error) {
      return [];
    }
  }
}
