import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export type VariableType = 'string' | 'number' | 'boolean' | 'enum' | 'regex' | 'json' | 'url' | 'email';

export interface VariableDefinition {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: unknown;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enumValues?: string[];
    format?: string;
  };
  sanitization?: {
    trimWhitespace?: boolean;
    stripHtml?: boolean;
    removeControlChars?: boolean;
    maxLength?: number;
    allowedTags?: string[];
  };
  description?: string;
  examples?: unknown[];
}

export interface VariableValidationResult {
  valid: boolean;
  sanitizedValue: unknown;
  errors: string[];
  warnings: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/.+/;

function sanitizeString(value: string, sanitization?: VariableDefinition['sanitization']): string {
  let result = value;
  if (sanitization?.trimWhitespace) result = result.trim();
  if (sanitization?.stripHtml) result = result.replace(/<[^>]*>/g, '');
  if (sanitization?.removeControlChars) result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (sanitization?.maxLength && result.length > sanitization.maxLength) {
    result = result.slice(0, sanitization.maxLength);
  }
  return result;
}

function validateVariable(
  definition: VariableDefinition,
  value: unknown,
): VariableValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (value === undefined || value === null) {
    if (definition.required) {
      return { valid: false, sanitizedValue: value, errors: [`${definition.name} is required`], warnings: [] };
    }
    return { valid: true, sanitizedValue: definition.defaultValue ?? value, errors: [], warnings: [] };
  }

  let sanitizedValue: unknown = value;

  switch (definition.type) {
    case 'string': {
      const strVal = String(value);
      sanitizedValue = sanitizeString(strVal, definition.sanitization);
      const sv = sanitizedValue as string;
      if (definition.validation?.minLength !== undefined && sv.length < definition.validation.minLength) {
        errors.push(`${definition.name}: minimum length is ${definition.validation.minLength}`);
      }
      if (definition.validation?.maxLength !== undefined && sv.length > definition.validation.maxLength) {
        errors.push(`${definition.name}: maximum length is ${definition.validation.maxLength}`);
      }
      if (definition.validation?.pattern && !new RegExp(definition.validation.pattern).test(sv)) {
        errors.push(`${definition.name}: does not match required pattern`);
      }
      break;
    }
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${definition.name}: must be a number`);
      } else {
        sanitizedValue = num;
        if (definition.validation?.min !== undefined && num < definition.validation.min) {
          errors.push(`${definition.name}: minimum value is ${definition.validation.min}`);
        }
        if (definition.validation?.max !== undefined && num > definition.validation.max) {
          errors.push(`${definition.name}: maximum value is ${definition.validation.max}`);
        }
      }
      break;
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        sanitizedValue = value;
      } else if (value === 'true' || value === '1') {
        sanitizedValue = true;
      } else if (value === 'false' || value === '0') {
        sanitizedValue = false;
      } else {
        errors.push(`${definition.name}: must be a boolean (true/false)`);
      }
      break;
    }
    case 'enum': {
      const strVal = String(value);
      const enumValues = definition.validation?.enumValues || [];
      if (!enumValues.includes(strVal)) {
        errors.push(`${definition.name}: must be one of [${enumValues.join(', ')}]`);
      }
      sanitizedValue = strVal;
      break;
    }
    case 'regex': {
      try {
        new RegExp(String(value));
        sanitizedValue = String(value);
      } catch {
        errors.push(`${definition.name}: must be a valid regular expression`);
      }
      break;
    }
    case 'url': {
      const strVal = String(value);
      if (!URL_PATTERN.test(strVal)) {
        errors.push(`${definition.name}: must be a valid URL (http/https)`);
      }
      sanitizedValue = strVal;
      break;
    }
    case 'email': {
      const strVal = String(value);
      if (!EMAIL_PATTERN.test(strVal)) {
        errors.push(`${definition.name}: must be a valid email address`);
      }
      sanitizedValue = strVal;
      break;
    }
    case 'json': {
      try {
        if (typeof value === 'string') {
          sanitizedValue = JSON.parse(value);
        }
      } catch {
        errors.push(`${definition.name}: must be valid JSON`);
      }
      break;
    }
    default:
      errors.push(`${definition.name}: unknown variable type ${definition.type}`);
  }

  if (typeof sanitizedValue === 'string') {
    sanitizedValue = sanitizeString(sanitizedValue as string, definition.sanitization);
  }

  if (errors.length === 0 && definition.sanitization?.maxLength) {
    const strLen = typeof sanitizedValue === 'string' ? (sanitizedValue as string).length : String(sanitizedValue).length;
    if (strLen > definition.sanitization.maxLength * 0.9) {
      warnings.push(`${definition.name}: value is approaching maximum length`);
    }
  }

  return { valid: errors.length === 0, sanitizedValue, errors, warnings };
}

export interface VariableBinding {
  promptVersionId: string;
  variables: Record<string, VariableDefinition>;
}

export class PromptVariableService {
  static async getVariables(promptVersionId: string): Promise<Record<string, VariableDefinition>> {
    const { data: version, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('variables_json')
      .eq('id', promptVersionId)
      .maybeSingle();
    if (error) throw error;
    if (!version?.variables_json) return {};
    if (typeof version.variables_json === 'string') {
      try { return JSON.parse(version.variables_json); } catch { return {}; }
    }
    return version.variables_json as Record<string, VariableDefinition>;
  }

  static async validateVariables(
    promptVersionId: string,
    values: Record<string, unknown>,
  ): Promise<{
    valid: boolean;
    validated: Record<string, unknown>;
    errors: string[];
    warnings: string[];
  }> {
    const definitions = await this.getVariables(promptVersionId);
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const validated: Record<string, unknown> = {};

    for (const [name, def] of Object.entries(definitions)) {
      const result = validateVariable(def, values[name]);
      if (!result.valid) allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      validated[name] = result.sanitizedValue;
    }

    const undefinedRequired = Object.entries(definitions)
      .filter(([name, def]) => def.required && !(name in values))
      .map(([name]) => `${name}: required but not provided`);
    allErrors.push(...undefinedRequired);

    return {
      valid: allErrors.length === 0,
      validated,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  static async sanitizeValue(
    promptVersionId: string,
    variableName: string,
    value: unknown,
  ): Promise<VariableValidationResult> {
    const definitions = await this.getVariables(promptVersionId);
    const def = definitions[variableName];
    if (!def) {
      return { valid: true, sanitizedValue: value, errors: [], warnings: [] };
    }
    return validateVariable(def, value);
  }

  static async storeVariableDefinitions(
    promptVersionId: string,
    variables: Record<string, VariableDefinition>,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('prompt_versions')
      .update({
        variables_json: JSON.stringify(variables),
        updated_at: new Date().toISOString(),
      })
      .eq('id', promptVersionId);
    if (error) throw error;

    await PromptAuditService.record({
      event_type: 'prompt.variables.updated',
      version_id: promptVersionId,
      reason: `Variable definitions updated: ${Object.keys(variables).length} variables`,
      after_state: { variable_count: Object.keys(variables).length, variable_names: Object.keys(variables) },
    });
  }
}
