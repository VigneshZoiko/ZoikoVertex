/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Data Seeder: Populates a rich demo environment.
 */
async function seed() {
  console.log('🚀 Initiating Enterprise Data Seeding...');

  // 1. Create a Demo Workspace if it doesn't exist
  const demoWorkspaceId = '00000000-0000-0000-0000-000000000000';
  
  // 2. Seed Agents
  const agents = [
    { id: uuidv4(), workspace_id: demoWorkspaceId, name: 'Forensic Observer', status: 'ACTIVE', autonomy_level: 'FULL', type: 'QUALITY_AGENT' },
    { id: uuidv4(), workspace_id: demoWorkspaceId, name: 'Brand Guardian', status: 'ACTIVE', autonomy_level: 'MONITORED', type: 'GOVERNANCE_AGENT' },
    { id: uuidv4(), workspace_id: demoWorkspaceId, name: 'Content Oracle', status: 'PAUSED', autonomy_level: 'RESTRICTED', type: 'PUBLISHING_AGENT' },
  ];

  for (const agent of agents) {
    await supabaseAdmin.from('agents').upsert(agent);
  }

  // 3. Seed Publish Intents (History)
  const intents: any[] = [
    { 
      workspace_id: demoWorkspaceId, 
      content: 'Exploring the future of decentralized AI in enterprise governance.', 
      platform: 'linkedin', 
      status: 'APPROVED', 
      risk_score: 12,
      risk_level: 'LOW',
      feedback: null
    },
    { 
      workspace_id: demoWorkspaceId, 
      content: 'Unregulated AI models are a risk to brand integrity. #AI #Governance', 
      platform: 'twitter', 
      status: 'REJECTED', 
      risk_score: 85,
      risk_level: 'CRITICAL',
      feedback: 'Too aggressive tone for brand standards.'
    },
    { 
      workspace_id: demoWorkspaceId, 
      content: 'Scaling intelligence with ZoikoVertex. The new standard for agency control.', 
      platform: 'linkedin', 
      status: 'PENDING', 
      risk_score: 45,
      risk_level: 'MEDIUM',
      feedback: null
    }
  ];

  for (const intent of intents) {
    await supabaseAdmin.from('publish_intents').insert(intent);
  }

  // 4. Seed System Logs
  const logs = [
    { level: 'info', service: 'RiskCommandCenter', message: 'Global security audit completed.' },
    { level: 'error', service: 'Auth', message: 'Unauthorized bypass attempt detected on cluster EU-1.' },
    { level: 'warn', service: 'Governance', message: 'Policy drift detected in Agent #42: Style consistency failing.' },
  ];

  for (const log of logs) {
    await supabaseAdmin.from('system_logs').insert(log);
  }

  console.log('✅ Seeding Complete. Demo environment is ready.');
}

seed().catch(err => console.error('❌ Seeding Failed:', err));
