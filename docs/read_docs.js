const mammoth = require('mammoth');
const path = require('path');

const docsDir = path.join(__dirname, 'project_docs');

const files = [
  'Z Vertex_Tech_Architecture_Master_Blueprint.docx',
  'ZoikoVertex _API_Architecture.docx',
  'ZoikoVertex_Admin_Dashboard_Sidebar_Architecture.docx',
  'ZoikoVertex_Agent_Autonomy_HITL_Control_Matrix.docx',
  'ZoikoVertex_Agent_Operating_Contract.docx',
  'ZoikoVertex_Agent_Studio_Identity_Management.docx',
  'ZoikoVertex_Approval_Workflow_Engine_Specification.docx',
  'ZoikoVertex_Backend_Documentation_Roadmap.docx',
  'ZoikoVertex_Brand_Standards_Content_Governance_Center.docx',
  'ZoikoVertex_Canonical_Data_Model_Database_Architecture.docx',
  'ZoikoVertex_Domain_Bounded_Context.docx',
  'ZoikoVertex_Evidence_Vault_Immutable_Audit_Ledger.docx',
  'ZoikoVertex_Intelligence_Optimization_Engine.docx',
  'ZoikoVertex_Phase1_Architecture_Summary.docx',
  'ZoikoVertex_Policy_Center_Governance_Rules_Engine.docx',
  'ZoikoVertex_Prompt_Governance_Lifecycle_Management_Center.docx',
  'ZoikoVertex_Risk_Compliance_Command_Center.docx',
  'ZoikoVertex_Roles_Permissions_Architecture.docx',
  'ZoikoVertex_Workflow_Orchestration_Multi_Agent_Operations_Engine.docx',
];

async function extractAll() {
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    console.log('\n' + '='.repeat(80));
    console.log('FILE: ' + file);
    console.log('='.repeat(80));
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(result.value);
      if (result.messages && result.messages.length > 0) {
        console.log('[WARNINGS: ' + result.messages.map(m => m.message).join('; ') + ']');
      }
    } catch (err) {
      console.log('[ERROR reading file: ' + err.message + ']');
    }
  }
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(80));
}

extractAll();
