"use client";

import { useCallback } from 'react';
import { api } from '@/lib/api';

export type AgentEventType =
  | 'agent.created'
  | 'agent.updated'
  | 'agent.test_passed'
  | 'agent.test_failed'
  | 'agent.approval_requested'
  | 'agent.approved'
  | 'agent.rejected'
  | 'agent.deployed'
  | 'agent.paused'
  | 'agent.restricted'
  | 'agent.rollback'
  | 'agent.retired'
  | 'agent.incident_opened'
  | 'agent.resumed'
  | 'agent.cloned';

export function useAgentEvents() {
  const logEvent = useCallback(async (
    eventType: AgentEventType,
    agentId: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await api.post(`/api/v1/agents/${agentId}/events`, {
        event_type: eventType,
        metadata: metadata || {},
      });
    } catch {
      // Non-blocking — event logging should never break the UX
    }
  }, []);

  const getEvents = useCallback(async (agentId: string) => {
    try {
      const result = await api.get(`/api/v1/agents/${agentId}/events`);
      return result.events || [];
    } catch {
      return [];
    }
  }, []);

  return { logEvent, getEvents };
}