ZOIKOVERTEX
Governed Autonomous Agentic Intelligence
Roles & Permissions Architecture
Governance-First Model for Social Media Management, Agentic AI Control, Human-in-the-Loop Validation, and Audit-Ready Enterprise Operations



1. Executive Summary
This document defines the locked ZoikoVertex roles and permissions architecture. It is designed for a platform that combines autonomous agentic AI, social media management, campaign operations, governed publishing, human-in-the-loop validation, evidence preservation, and enterprise compliance controls.
The strongest model is not the most dramatic or ceremonial model. The strongest model is clear, enforceable, commercially scalable, and defensible in front of enterprise procurement, security, legal, and compliance teams.

2. Final Core Role Set

3. Advanced and Enterprise Extension Roles
These roles should be supported by the product, but they should appear as advanced roles, custom roles, or enterprise permissions rather than default MVP labels.

4. Naming Decisions

5. Separation of Duties Model
ZoikoVertex must enforce a three-control model for governed agentic social media operations. This prevents a single user from building the AI logic, setting its policy boundaries, approving its output, and publishing it without oversight.

6. Non-Negotiable Permission Safeguards

7. Three-Key Approval Protocol
For high-risk content, regulated claims, legal-sensitive posts, executive statements, financial claims, healthcare-related content, political content, crisis communications, or protected-brand content, ZoikoVertex should support a three-key approval protocol.


8. Permission Architecture
The role model should not be hard-coded as job titles only. ZoikoVertex should use system roles, custom roles, permission scopes, approval authority levels, and temporary elevated access.

9. Commercial Role Packaging
Governance should be a revenue driver. ZoikoVertex can package advanced controls, auditability, separation of duties, and evidence features into higher-value plans without weakening usability for smaller teams.

10. Engineering Instruction

This is essential because a user may be an Approver for one brand, a Viewer for another, and blocked entirely from a regulated campaign in a different region.
11. Final Role Lists
11.1 Default UI Role List
Workspace Owner
Admin
Governance Admin
Agent Architect
Agent Operator
Knowledge Manager
Campaign Manager
Creator
Reviewer
Validator
Approver
Publisher
Auditor
Developer
External Collaborator
Viewer
11.2 Enterprise Add-On Role List
Security Admin
Privacy Admin
Risk Manager
Compliance Reviewer
Evidence Manager
Model Supervisor
Autonomy Controller
Prompt Manager
Workflow Architect
Asset Manager
Brand Reviewer
Community Manager
Final Approver
Platform Engineer
Data Connector Admin
Billing Admin
12. Final Verdict
The strongest ZoikoVertex role architecture is not the most theatrical one. It is the clearest, most enforceable, most commercially scalable, and most defensible one.
The locked model gives ZoikoVertex the correct balance of social media usability, agentic AI governance, enterprise control, audit defensibility, commercial packaging, and Fortune 10-grade separation of duties.

 |  | 
 | Canonical Positioning
ZoikoVertex is a governed autonomous agentic-intelligence social media management platform. Its role architecture must protect brand integrity, control agent autonomy, manage social publishing, preserve human accountability, and produce audit-ready evidence.
Field | Specification
Document Status | Locked Canonical Reference
Prepared For | Product, Engineering, Design, Governance, Legal, Compliance, Sales, and Customer Success Teams
Language | American English
Quality Standard | Enterprise SaaS
Core Security Doctrine | RBAC with ABAC extensions, least privilege, separation of duties, immutable auditability
 | Final Architectural Decision
Use clear SaaS-native UI role labels supported by institutional-grade permissions underneath. The UI should be simple enough for users to understand, while the permission model must enforce least privilege, separation of duties, governed autonomy, and audit defensibility.
Role | Purpose
Workspace Owner | Full workspace ownership, billing authority, subscription control, ownership transfer, and highest-level administrative authority.
Admin | Manages workspace settings, users, integrations, platform configuration, and day-to-day administration.
Governance Admin | Manages policies, approval rules, autonomy controls, escalation rules, risk thresholds, and governance configuration.
Agent Architect | Builds, configures, tests, and maintains AI agents, agent logic, and agent operating rules.
Agent Operator | Runs, supervises, pauses, monitors, and escalates agent activity during approved workflows.
Knowledge Manager | Manages knowledge bases, approved sources, retrieval permissions, source freshness, and RAG integrity.
Campaign Manager | Manages campaigns, content projects, briefs, timelines, assignments, and campaign execution.
Creator | Creates draft posts, captions, content ideas, creative assets, scripts, and AI-assisted outputs.
Reviewer | Performs general review of content, assets, drafts, and agent outputs before approval.
Validator | Performs higher-trust human-in-the-loop validation for accuracy, brand fit, risk, compliance, and publishing readiness.
Approver | Approves content, assets, campaigns, or publishing actions within assigned authority.
Publisher | Schedules and publishes approved content to connected social platforms.
Auditor | Read-only access to audit trails, evidence records, approval history, publishing logs, and governance activity.
Developer | Manages APIs, webhooks, sandbox tools, integration logs, technical access, and developer operations.
External Collaborator | Restricted external user for agencies, contractors, legal reviewers, partners, or freelancers.
Viewer | Read-only access to permitted dashboards, projects, reports, assets, or campaign views.
Advanced Role | Recommended Scope
Security Admin | SSO, MFA, access controls, trusted domains, session rules, IP restrictions, device controls, and security logs.
Privacy Admin | Retention, exports, deletion requests, consent settings, data handling rules, and privacy configuration.
Risk Manager | AI risk, brand risk, reputational risk, publishing risk, and operational risk monitoring.
Compliance Reviewer | Jurisdictional, legal, policy, industry, and regulatory review.
Evidence Manager | Evidence Vault, legal hold, preserved records, evidence packages, investigations, and exports.
Model Supervisor | Drift, hallucination flags, override rates, failure rates, quality metrics, and token ROI.
Autonomy Controller | Agent independence boundaries, escalation rules, prohibited actions, and autonomy tiers.
Prompt Manager | Prompt templates, prompt libraries, restricted prompts, version control, and prompt governance.
Workflow Architect | Multi-agent workflows, conditional logic, routing, handoffs, and escalation design.
Asset Manager | Media Vault lifecycle, metadata, tags, asset usage rights, archiving, and asset governance.
Brand Reviewer | Tone, visual rules, logo usage, claims, brand consistency, and prohibited language.
Community Manager | Replies, comments, engagement workflows, sensitive-interaction escalation, and community monitoring.
Final Approver | High-risk, regulated, executive, legal, or brand-sensitive final approval authority.
Platform Engineer | Integration health, connectivity, failed jobs, technical configuration, and operational reliability.
Data Connector Admin | Import pipelines, cloud repositories, structured data sources, connectors, and synchronization rules.
Billing Admin | Invoices, payment methods, seats, plan status, usage limits, and billing contacts.
Approved Label | Reason
Workspace Owner | Use instead of Owner where clarity is needed. It confirms the role owns the workspace, not the company itself.
Governance Admin | Use instead of Governor. It describes the actual product function and is easier for administrators to understand.
Agent Architect | Use instead of Agent Builder. It is more enterprise-grade while remaining clear.
Knowledge Manager | Use instead of Data Sovereign. It is clearer, less theatrical, and better aligned with RAG source governance.
Validator | Use for higher-trust human-in-the-loop validation, separate from general reviewing.
Auditor | Use for read-only audit and evidence visibility. It is enterprise-recognized and procurement-safe.
External Collaborator | Use as the umbrella role for agencies, contractors, external reviewers, partners, and freelancers.
Control Layer | Primary Roles | Purpose
Build Control | Agent Architect, Knowledge Manager, Prompt Manager, Workflow Architect, Developer | Creates or configures agents, prompts, workflows, knowledge sources, and technical access. These roles should not automatically approve or publish high-risk outputs produced by systems they configured.
Governance Control | Governance Admin, Security Admin, Privacy Admin, Risk Manager, Compliance Reviewer, Autonomy Controller | Defines policies, access rules, risk thresholds, autonomy limits, escalation requirements, and evidence requirements.
Output Control | Reviewer, Validator, Approver, Final Approver, Publisher | Reviews, validates, approves, and publishes final outputs according to policy and approval state.
Safeguard | Required Control
Agent/output separation | A user who builds an agent cannot approve that agent’s high-risk output without override.
Prompt/output separation | A user who creates or edits a prompt cannot publish content generated from that prompt without review.
Knowledge/output separation | A user who manages a knowledge source cannot solely validate sensitive claims derived from that source.
Creator/approval separation | A Creator cannot approve their own content unless the workspace explicitly permits low-risk self-approval.
Publishing lock | A Publisher cannot bypass required approvals.
External access restriction | External Collaborators cannot access billing, security, privacy, audit, or workspace ownership settings.
Audit integrity | Auditors must be read-only by default.
Evidence integrity | Admins cannot silently alter immutable audit records.
Policy version control | Governance Admins can change rules, but policy changes must be versioned and logged.
Dual control | High-risk content requires at least two distinct human roles before publishing.
Three-key control | Regulated or enterprise content can require three-key approval.
Override defensibility | Emergency overrides must capture reason, timestamp, user identity, and audit log entry.
Approval Key | Responsible Roles | Control Objective
Key 1: Technical / Agentic Confirmation | Agent Architect, Knowledge Manager, Prompt Manager, Workflow Architect | Confirms that the agent, prompt, workflow, and knowledge source are correctly configured.
Key 2: Governance Confirmation | Governance Admin, Risk Manager, Compliance Reviewer, Brand Reviewer, Privacy Admin | Confirms that the output complies with brand rules, policy, legal constraints, jurisdictional requirements, and autonomy limits.
Key 3: Output Approval | Validator, Approver, Final Approver | Confirms that the final content is accurate, appropriate, brand-safe, and ready for publishing.
 | Publishing Rule
Only after the required approval keys are satisfied should the Publisher be able to schedule or publish the content.
Architecture Element | Specification
System Roles | Predefined roles such as Workspace Owner, Admin, Creator, Reviewer, Publisher, and Auditor.
Custom Roles | Enterprise customers can create permission bundles that match their internal operating model.
Permission Scopes | Permissions can be limited by workspace, brand, business unit, campaign, social account, project, asset folder, agent, knowledge base, region, risk level, and approval state.
Approval Authority Levels | Approval limits can vary by content risk level, campaign type, brand, region, channel, regulated content category, and spend level if paid media is later added.
Temporary Elevated Access | Time-bound elevated access with approval, reason capture, automatic expiry, and audit logging.
Plan | Roles / Controls | Best Fit
Standard | Workspace Owner, Admin, Campaign Manager, Creator, Reviewer, Approver, Publisher, Viewer | Small teams and simple social media operations.
Professional | Everything in Standard, plus Agent Architect, Agent Operator, Knowledge Manager, Governance Admin, Validator, Developer, External Collaborator | AI-assisted teams using agentic workflows and outside collaborators.
Enterprise | Everything in Professional, plus Security Admin, Privacy Admin, Risk Manager, Compliance Reviewer, Auditor, Evidence Manager, Model Supervisor, Autonomy Controller, Prompt Manager, Workflow Architect, Final Approver, Custom Roles, Advanced Separation of Duties, Three-Key Approval, Legal Hold, Evidence Vault, Policy Versioning, Advanced Audit Exports | Governed autonomous operations, regulated teams, global brands, multi-entity organizations, and audit-heavy customers.
 | Build Standard
Build the ZoikoVertex role system as permission-based RBAC with enterprise ABAC extensions. RBAC defines the user’s role. ABAC refines what the user can do based on context, including brand, region, campaign, content type, social account, risk level, business unit, approval state, and project scope.
 | Canonical Architecture
Workspace Owner -> Admin -> Governance Admin -> Agent Architect -> Agent Operator -> Knowledge Manager -> Campaign Manager -> Creator -> Reviewer -> Validator -> Approver -> Publisher -> Auditor -> Developer -> External Collaborator -> Viewer