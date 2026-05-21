import { supabaseAdmin } from '../../shared/supabase';
import * as crypto from 'crypto';

export class PromptVersionService {
  static async listByPrompt(promptId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async getLatestVersionNumber(promptId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('version_number')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.version_number || 0;
  }

  static async create(input: {
    prompt_id: string;
    body: string;
    variables_json?: Record<string, unknown>;
    guardrails_json?: Record<string, unknown>;
    model_routes_json?: Record<string, unknown>;
    change_summary?: string;
    created_by?: string;
  }) {
    const latestVersion = await this.getLatestVersionNumber(input.prompt_id);
    const versionNumber = latestVersion + 1;
    const bodyHash = crypto.createHash('sha256').update(input.body).digest('hex');

    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .insert({
        prompt_id: input.prompt_id,
        version_number: versionNumber,
        body: input.body,
        body_hash: bodyHash,
        variables_json: input.variables_json || {},
        guardrails_json: input.guardrails_json || {},
        model_routes_json: input.model_routes_json || {},
        change_summary: input.change_summary || '',
        created_by: input.created_by || null,
        immutable: false,
      })
      .select()
      .single();
    if (error) throw error;

    // Update prompt's current_version_id
    await supabaseAdmin
      .from('prompts')
      .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
      .eq('id', input.prompt_id);

    return data;
  }

  static async markImmutable(id: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .update({
        immutable: true,
        immutable_after: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('prompt_versions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
}
