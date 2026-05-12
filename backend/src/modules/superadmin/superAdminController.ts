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

      // 4. Create the Workspace (Organization)
      const { data: workspace, error: wsError } = await supabaseAdmin
        .from('workspaces')
        .insert({ name })
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

      const { data, error } = await supabaseAdmin
        .from('workspaces')
        .select('*, workspace_members(count)');

      if (error) throw error;
      res.json({ success: true, data });
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

      // Aggregate counts across all organizations
      const [
        { count: orgCount },
        { count: userCount },
        { count: postCount },
        { count: assetCount },
        { count: accountCount }
      ] = await Promise.all([
        supabaseAdmin.from('workspaces').select('*', { count: 'exact', head: true }),
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
