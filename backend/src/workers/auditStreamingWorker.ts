import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { deliverToSubscription, Subscription } from '../services/auditTrailStreaming.service';

export function initAuditStreamingWorker() {
  const POLL_INTERVAL = 30_000;
  let running = false;
  let lastCursor: string | null = null;

  async function poll() {
    if (running) return;
    running = true;

    try {
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('audit_subscriptions')
        .select('*')
        .eq('status', 'ACTIVE');

      if (subError || !subscriptions || subscriptions.length === 0) {
        running = false;
        return;
      }

      let query = supabaseAdmin
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (lastCursor) {
        query = query.gt('created_at', lastCursor);
      }

      const { data: events, error: eventError } = await query;
      if (eventError || !events || events.length === 0) {
        running = false;
        return;
      }

      lastCursor = events[events.length - 1].created_at;

      for (const sub of subscriptions as Subscription[]) {
        const filters = (sub.event_filters || {}) as {
          event_types?: string[];
          risk_levels?: string[];
          categories?: string[];
        };

        let delivered = false;
        for (const event of events) {
          if (filters.event_types && filters.event_types.length > 0) {
            if (!filters.event_types.includes(event.event_type)) continue;
          }
          if (filters.risk_levels && filters.risk_levels.length > 0) {
            if (!filters.risk_levels.includes(event.risk_level)) continue;
          }
          if (filters.categories && filters.categories.length > 0) {
            if (!filters.categories.includes(event.event_category)) continue;
          }

          try {
            await deliverToSubscription(sub, event);
            delivered = true;
          } catch (err) {
            logger.warn({ subscriptionId: sub.id, eventId: event.event_id, err }, '[audit-stream-worker] delivery failed');
          }
        }

        // One update per subscription per poll cycle, not one per matched event.
        if (delivered) {
          await supabaseAdmin
            .from('audit_subscriptions')
            .update({ last_delivery_at: new Date().toISOString() })
            .eq('id', sub.id);
        }
      }
    } catch (err) {
      logger.error({ err }, '[audit-stream-worker] poll error');
    } finally {
      running = false;
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL);
  logger.info('[audit-stream-worker] Started (poll every 30s)');
}
