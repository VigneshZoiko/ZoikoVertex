import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';

const TicketSchema = z.object({
  category: z.string(),
  urgency: z.string(),
  subject: z.string(),
  description: z.string(),
});

export class SupportController {
  
  /**
   * Submit a new support ticket
   */
  static async submitTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { category, urgency, subject, description } = TicketSchema.parse(req.body);

      // Get user's workspace
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .single();

      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .insert({
          user_id: userId,
          workspace_id: member?.workspace_id || null,
          category,
          urgency,
          subject,
          description,
          status: 'OPEN'
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`[Support] New ticket created by user ${userId}: ${subject}`);
      res.status(201).json({ success: true, ticket });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all tickets (SuperAdmin only)
   */
  static async listAllTickets(req: AuthRequest, res: Response, next: NextFunction) {
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

      const { data: tickets, error } = await supabaseAdmin
        .from('support_tickets')
        .select('*, users(email, full_name), workspaces(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, tickets });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve/Update ticket status (SuperAdmin only)
   */
  static async updateTicketStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const userId = req.user?.id;

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (!user?.is_superadmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, ticket });
    } catch (error) {
      next(error);
    }
  }
}
