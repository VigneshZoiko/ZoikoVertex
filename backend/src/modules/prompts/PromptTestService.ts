import { supabaseAdmin } from '../../shared/supabase';

export class PromptTestService {
  static async listSuites(promptId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_test_suites')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createSuite(input: {
    prompt_id: string;
    suite_name: string;
    required_for_risk_tier?: string[];
    scenario_count?: number;
    evaluator_config?: Record<string, unknown>;
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_test_suites')
      .insert({
        prompt_id: input.prompt_id,
        suite_name: input.suite_name,
        required_for_risk_tier: input.required_for_risk_tier || [],
        scenario_count: input.scenario_count || 0,
        evaluator_config: input.evaluator_config || {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async listRuns(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_test_runs')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createRun(input: {
    prompt_version_id: string;
    suite_id: string;
    environment?: string;
    score_summary?: Record<string, unknown>;
    run_metadata?: Record<string, unknown>;
    output_artifacts_uri?: string;
    created_by?: string;
  }) {
    const score = Number((input.score_summary as { score?: number } | undefined)?.score ?? 0);
    const passFail = score >= 80 ? 'PASS' : 'FAIL';

    const { data, error } = await supabaseAdmin
      .from('prompt_test_runs')
      .insert({
        prompt_version_id: input.prompt_version_id,
        suite_id: input.suite_id,
        environment: input.environment || 'draft',
        pass_fail: passFail,
        score_summary: input.score_summary || {},
        run_metadata: input.run_metadata || {},
        output_artifacts_uri: input.output_artifacts_uri || '',
        created_by: input.created_by || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
