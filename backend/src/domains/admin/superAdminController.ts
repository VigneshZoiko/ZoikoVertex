import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';

const CreateOrgSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters'),
  adminEmail: z.string().email('Invalid email address').refine(
    (email) => !email.toLowerCase().endsWith('@gmail.com'),
    { message: 'Gmail accounts are not allowed for Organization Admins. Please use a company domain.' }
  ),
  adminName: z.string().min(2, 'Admin name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * SuperAdmin Controller
 * Handles platform-wide management
 */
export class SuperAdminController {
  
  /**
   * Creates a new organization (workspace) and assigns a restricted admin
   */
  static async createOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      // 1. Verify SuperAdmin Status
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (userError || !user?.is_superadmin) {
        return res.status(403).json({ error: 'Access denied: SuperAdmin privileges required.' });
      }

      // 2. Validate Input
      const { name, adminEmail, adminName, password } = CreateOrgSchema.parse(req.body);

      // 2a. Reject email domain if it belongs to a permanently deleted org
      const domain = adminEmail.toLowerCase().split('@')[1];
      if (domain) {
        const { data: deletedOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('deleted_domain', domain)
          .eq('status', 'DELETED')
          .maybeSingle();
        if (deletedOrg) {
          return res.status(403).json({
            error: `Cannot create an organization with email domain @${domain}. This domain belongs to a permanently deleted organization.`,
          });
        }
      }

      logger.info(`[SuperAdmin] Creating organization: ${name} with admin: ${adminEmail}`);

      let adminUserId: string;

      // 3. Provision User in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail.toLowerCase(),
        password: password,
        email_confirm: true
      });

      if (authError) {
        // If user already exists, we attempt to find their ID
        if (authError.message.includes('already registered')) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const existing = users.users.find(u => u.email === adminEmail.toLowerCase());
          if (!existing) throw authError;
          
          // Update password for existing user as requested
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
          adminUserId = existing.id;
        } else {
          throw authError;
        }
      } else {
        adminUserId = authUser.user.id;
      }

      // 4. Create the Workspace (Organization) — immediately active, no approval needed
      const { data: workspace, error: wsError } = await supabaseAdmin
        .from('workspaces')
        .insert({ name, status: 'ACTIVE' })
        .select()
        .single();

      if (wsError) throw wsError;

      // 5. Ensure user exists in public.users
      const { error: publicUserError } = await supabaseAdmin
        .from('users')
        .upsert({ 
          id: adminUserId,
          email: adminEmail.toLowerCase(), 
          full_name: adminName 
        });
      
      if (publicUserError) throw publicUserError;

      // 5. Assign as ADMIN to the new workspace
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: adminUserId,
          role: 'ADMIN'
        });

      if (memberError) throw memberError;

      res.status(201).json({
        success: true,
        message: 'Organization created and Admin assigned successfully.',
        data: {
          organization: workspace,
          admin: {
            id: adminUserId,
            email: adminEmail,
            name: adminName
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Approves a pending organization and its workspaces
   */
  static async approveOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { orgId } = req.params;

      // 1. Verify SuperAdmin
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (!user?.is_superadmin) {
        return res.status(403).json({ error: 'Access denied: SuperAdmin privileges required.' });
      }

      logger.info(`[SuperAdmin] Approving organization: ${orgId}`);

      // 2. Activate Organization
      const { error: orgError } = await supabaseAdmin
        .from('organizations')
        .update({ status: 'ACTIVE' })
        .eq('id', orgId);

      if (orgError) throw orgError;

      // 3. Activate associated Workspaces
      const { error: wsError } = await supabaseAdmin
        .from('workspaces')
        .update({ status: 'ACTIVE' })
        .eq('org_id', orgId);

      if (wsError) throw wsError;

      res.json({ success: true, message: 'Organization and associated workspaces activated.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all organizations for platform monitoring
   */
  static async listAllOrganizations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (!user?.is_superadmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: workspaces, error } = await supabaseAdmin
        .from('workspaces')
        .select('*, workspace_members(count), organizations!inner(id)')
        .neq('organizations.status', 'DELETED');

      if (error) throw error;

      // Batch-fetch admin info for all workspaces in one query
      const wsIds = (workspaces || []).map(w => w.id);
      const adminMap: Record<string, { full_name: string | null; email: string | null }> = {};

      if (wsIds.length > 0) {
        const { data: admins } = await supabaseAdmin
          .from('workspace_members')
          .select('workspace_id, users(full_name, email)')
          .in('workspace_id', wsIds)
          .in('role', ['ADMIN', 'WORKSPACE_OWNER']);

        if (admins) {
          for (const entry of admins) {
            const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
            adminMap[entry.workspace_id] = {
              full_name: (userData as any)?.full_name || null,
              email: (userData as any)?.email || null,
            };
          }
        }
      }

      const result = (workspaces || []).map(ws => ({
        id: ws.id,
        name: ws.name,
        status: ws.status,
        type: ws.type,
        plan_type: ws.type,
        memberCount: Array.isArray(ws.workspace_members)
          ? (ws.workspace_members[0] as any)?.count ?? 0
          : 0,
        adminName: adminMap[ws.id]?.full_name || null,
        adminEmail: adminMap[ws.id]?.email || null,
      }));

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Pause an organization — sets workspace + parent org status to SUSPENDED
   */
  static async pauseOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      await supabaseAdmin
        .from('workspaces')
        .update({ status: 'SUSPENDED' })
        .eq('id', orgId);

      if (ws?.org_id) {
        await supabaseAdmin
          .from('organizations')
          .update({ status: 'SUSPENDED' })
          .eq('id', ws.org_id);
      }

      res.json({ success: true, message: 'Organization paused.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume an organization — sets workspace + parent org status back to ACTIVE
   * and grants a 30-day premium grace period to prevent immediate auto-pause.
   */
  static async resumeOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      const graceUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from('workspaces')
        .update({ status: 'ACTIVE' })
        .eq('id', orgId);

      if (ws?.org_id) {
        await supabaseAdmin
          .from('organizations')
          .update({ status: 'ACTIVE', premium_paid_until: graceUntil })
          .eq('id', ws.org_id);
      }

      res.json({ success: true, message: 'Organization resumed. 30-day premium grace period applied.' });
    } catch (error) {
      next(error);
    }
  }

  // Throttle auto-pause to run at most once every 60 seconds
  static lastPremiumCheck = 0;

  /**
   * Consolidated analytics — returns orgs + stats in one call
   * Auto-pauses organizations with unpaid premium (throttled to 60s).
   */
  static async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Auto-pause check — throttled to once per minute
      const now = Date.now();
      if (now - SuperAdminController.lastPremiumCheck > 60000) {
        SuperAdminController.lastPremiumCheck = now;
        const isoNow = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const { data: unpaidOrgs } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .in('plan_type', ['STARTER', 'GROWTH', 'ENTERPRISE'])
          .eq('status', 'ACTIVE')
          .or(`premium_paid_until.is.null,premium_paid_until.lt.${isoNow}`);

        if (unpaidOrgs && unpaidOrgs.length > 0) {
          const unpaidOrgIds = unpaidOrgs.map(o => o.id);
          await Promise.all([
            supabaseAdmin.from('organizations').update({ status: 'SUSPENDED' }).in('id', unpaidOrgIds),
            supabaseAdmin.from('workspaces').update({ status: 'SUSPENDED' }).in('org_id', unpaidOrgIds),
          ]);
        }
      }

      const [orgResult, statsResult] = await Promise.all([
        supabaseAdmin
          .from('workspaces')
          .select('id, name, status, type, org_id, workspace_members(count), organizations!inner(plan_type, status, premium_paid_until)')
          .neq('organizations.status', 'DELETED'),
        (async () => {
          const [
            { count: orgCount },
            { count: userCount },
            { count: postCount },
            { count: assetCount },
            { count: accountCount }
          ] = await Promise.all([
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }).neq('status', 'DELETED'),
            supabaseAdmin.from('users').select('id', { count: 'estimated', head: true }),
            supabaseAdmin.from('scheduled_posts').select('id', { count: 'estimated', head: true }),
            supabaseAdmin.from('media_library').select('id', { count: 'estimated', head: true }),
            supabaseAdmin.from('connected_accounts').select('id', { count: 'estimated', head: true })
          ]);
          return { organizations: orgCount || 0, totalUsers: userCount || 0, totalPosts: postCount || 0, totalAssets: assetCount || 0, socialConnections: accountCount || 0, platformStatus: 'Operational' };
        })()
      ]);

      if (orgResult.error) throw orgResult.error;

      const wsIds = (orgResult.data || []).map(w => w.id);
      const adminMap: Record<string, { full_name: string | null; email: string | null }> = {};

      if (wsIds.length > 0) {
        const { data: admins } = await supabaseAdmin
          .from('workspace_members')
          .select('workspace_id, users(full_name, email)')
          .in('workspace_id', wsIds)
          .in('role', ['ADMIN', 'WORKSPACE_OWNER']);

        if (admins) {
          for (const entry of admins) {
            const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
            adminMap[entry.workspace_id] = {
              full_name: (userData as any)?.full_name || null,
              email: (userData as any)?.email || null,
            };
          }
        }
      }

      const data = (orgResult.data || []).map(ws => {
        const orgData = Array.isArray(ws.organizations) ? ws.organizations[0] : ws.organizations;
        return {
          id: ws.id,
          name: ws.name,
          status: orgData?.status === 'SUSPENDED' ? 'SUSPENDED' : ws.status,
          type: ws.type,
          plan_type: orgData?.plan_type || ws.type,
          premium_paid_until: orgData?.premium_paid_until || null,
          memberCount: Array.isArray(ws.workspace_members) ? (ws.workspace_members[0] as any)?.count ?? 0 : 0,
          adminName: adminMap[ws.id]?.full_name || null,
          adminEmail: adminMap[ws.id]?.email || null,
        };
      });

      res.json({ success: true, data, stats: statsResult });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restrict an organization — sets workspace + parent org status to RESTRICTED
   */
  static async restrictOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      await supabaseAdmin
        .from('workspaces')
        .update({ status: 'RESTRICTED' })
        .eq('id', orgId);

      if (ws?.org_id) {
        await supabaseAdmin
          .from('organizations')
          .update({ status: 'RESTRICTED' })
          .eq('id', ws.org_id);
      }

      res.json({ success: true, message: 'Organization restricted.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually upgrade an organization's plan (SuperAdmin only)
   */
  static async upgradeOrganizationPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;
      const { planType } = req.body;

      if (!planType || !['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type. Must be FREE, STARTER, GROWTH, or ENTERPRISE.' });
      }

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      await supabaseAdmin
        .from('workspaces')
        .update({ status: 'ACTIVE' })
        .eq('id', orgId);

      if (ws?.org_id) {
        const updateData: Record<string, any> = { status: 'ACTIVE', plan_type: planType };
        // Set a 1-year premium grace for paid plans
        if (planType !== 'FREE' && planType !== 'STARTER') {
          updateData.premium_paid_until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          updateData.premium_paid_until = null;
        }
        await supabaseAdmin
          .from('organizations')
          .update(updateData)
          .eq('id', ws.org_id);
      }

      res.json({ success: true, message: `Organization plan changed to ${planType}.` });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Permanently delete an organization and all its data (irreversible).
   * Workspaces are cascade-deleted via FK constraint.
   */
  static async deleteOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;

      // Resolve the actual org_id — the route param may be an org or workspace id
      let resolvedOrgId: string = String(orgId);
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      if (ws?.org_id) resolvedOrgId = ws.org_id;

      // 1. Collect all workspace_members user_ids for this org
      const { data: workspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('org_id', resolvedOrgId);

      const workspaceIds = (workspaces ?? []).map((w: any) => w.id);

      let authUserIds: string[] = [];
      if (workspaceIds.length > 0) {
        const { data: members } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .in('workspace_id', workspaceIds);

        authUserIds = [...new Set((members ?? []).map((m: any) => m.user_id))];
      }

      // 2. Delete the organization — cascades to workspaces, workspace_members, etc.
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', resolvedOrgId);

      // 3. Delete each user from auth.users (also cascades to public.users via FK)
      //    Only delete users who are not members of any other workspace
      let deletedCount = 0;
      for (const uid of authUserIds) {
        const { count } = await supabaseAdmin
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid);

        if ((count ?? 0) === 0) {
          await supabaseAdmin.auth.admin.deleteUser(uid);
          deletedCount++;
        }
      }

      res.json({
        success: true,
        message: `Organization permanently deleted. ${deletedCount} user(s) removed from auth.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore a restricted organization back to ACTIVE status.
   */
  static async restoreOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', orgId)
        .single();

      await supabaseAdmin
        .from('workspaces')
        .update({ status: 'ACTIVE' })
        .eq('id', orgId);

      if (ws?.org_id) {
        await supabaseAdmin
          .from('organizations')
          .update({ status: 'ACTIVE' })
          .eq('id', ws.org_id);
      }

      res.json({ success: true, message: 'Organization restored and reactivated.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Downgrade the current user's organization to FREE plan and resume it.
   */
  static async downgradeToFreePlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id, workspaces(org_id)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (!member) return res.status(404).json({ error: 'No workspace found for user' });

      const ws = Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces;
      const workspaceId = member.workspace_id;
      const orgId = ws?.org_id;

      await Promise.all([
        supabaseAdmin.from('workspaces').update({ status: 'ACTIVE' }).eq('id', workspaceId),
        orgId
          ? supabaseAdmin.from('organizations').update({ status: 'ACTIVE', plan_type: 'FREE', premium_paid_until: null }).eq('id', orgId)
          : Promise.resolve(),
      ]);

      res.json({ success: true, message: 'Organization downgraded to FREE plan and resumed.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get high-level platform statistics
   */
  static async getPlatformStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (!user?.is_superadmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Aggregate counts across all organizations (excluding DELETED)
      const [
        { count: orgCount },
        { count: userCount },
        { count: postCount },
        { count: assetCount },
        { count: accountCount }
      ] = await Promise.all([
        supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }).neq('status', 'DELETED'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('scheduled_posts').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('media_library').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('connected_accounts').select('*', { count: 'exact', head: true })
      ]);

      res.json({
        success: true,
        stats: {
          organizations: orgCount || 0,
          totalUsers: userCount || 0,
          totalPosts: postCount || 0,
          totalAssets: assetCount || 0,
          socialConnections: accountCount || 0,
          platformStatus: 'Operational'
        }
      });
    } catch (error) {
      next(error);
    }
  }

}
