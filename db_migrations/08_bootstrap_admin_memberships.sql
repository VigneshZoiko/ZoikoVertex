-- Create the ADMIN role if it's missing
INSERT INTO roles (name, scope)
SELECT 'ADMIN', 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');

-- Ensure every user has a 'domain_users' profile
INSERT INTO domain_users (id, org_id, auth_user_id, email, full_name)
SELECT 
  id, 
  (SELECT id FROM organizations LIMIT 1), 
  id, 
  email, 
  full_name
FROM users
ON CONFLICT (org_id, email) DO NOTHING;

-- Add EVERY user to the 'Main Workspace' as an ADMIN
INSERT INTO memberships (user_id, workspace_id, role_id)
SELECT 
  du.id, 
  (SELECT id FROM workspaces WHERE name = 'Main Workspace' LIMIT 1),
  (SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1)
FROM domain_users du
ON CONFLICT (user_id, workspace_id) DO NOTHING;
