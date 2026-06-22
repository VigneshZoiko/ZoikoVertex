'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Filter,
  User,
  Globe,
  Archive,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

interface Ticket {
  id: string;
  category: string;
  urgency: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
  workspaces: {
    name: string;
  };
}

export default function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  }, []);

  const activeTickets = useMemo(
    () => tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS'),
    [tickets]
  );

  const resolvedTickets = useMemo(
    () => tickets.filter(t => t.status === 'RESOLVED' && new Date(t.created_at) >= sixMonthsAgo),
    [tickets, sixMonthsAgo]
  );

  const displayedTickets = showLog ? resolvedTickets : activeTickets;

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const result = await api.get('/api/v1/superadmin/tickets');
        if (result.success) {
          setTickets(result.tickets);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const result = await api.patch(`/api/v1/superadmin/tickets/${id}`, { status: newStatus });
      if (result.success) {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error('Update failed');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
            {showLog ? 'Resolved Log' : 'Support Inbox'}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
            {showLog
              ? 'Resolved tickets from the last 6 months'
              : `Manage user queries`
            }
            {!showLog && activeTickets.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                {activeTickets.length} active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showLog
                ? 'bg-[var(--accent)] text-foreground'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showLog ? 'Active Queue' : `Log (${resolvedTickets.length})`}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-bg border border-error-border rounded-lg px-4 py-3 text-sm text-error-text">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-5 h-5 text-[var(--foreground-muted)] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">Loading tickets...</p>
        </div>
      ) : displayedTickets.length === 0 ? (
        /* Empty state */
        <div className="py-16 text-center border border-dashed border-[var(--border)] rounded-lg">
          <CheckCircle2 className="w-10 h-10 text-[var(--foreground-muted)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-medium text-[var(--foreground-muted)]">
            {showLog ? 'No resolved tickets' : 'Inbox is empty'}
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] opacity-60 mt-1">
            {showLog
              ? 'No tickets have been resolved in the last 6 months.'
              : 'All queries have been addressed.'
            }
          </p>
        </div>
      ) : (
        /* Ticket list */
        <div className="space-y-2">
          {displayedTickets.map((ticket) => (
            <div key={ticket.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg group hover:border-[var(--border-hover)] transition-colors">
              <div className="p-4">
                {/* Top row: badges + date */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    ticket.status === 'OPEN'
                      ? 'bg-info-bg text-info-text'
                      : ticket.status === 'IN_PROGRESS'
                        ? 'bg-warning-bg text-warning-text'
                        : 'bg-success-bg text-success-text'
                  }`}>
                    {ticket.status === 'IN_PROGRESS' ? 'IN PROGRESS' : ticket.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    (ticket.urgency || '').includes('Critical')
                      ? 'bg-error-bg text-error-text'
                      : (ticket.urgency || '').includes('Urgent')
                        ? 'bg-warning-bg text-warning-text'
                        : 'bg-info-bg text-info-text'
                  }`}>
                    {((ticket.urgency || '').split(' ')[0]) || '—'}
                  </span>
                  <span className="text-xs text-[var(--foreground-muted)] flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Subject + Description */}
                <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">{ticket.subject}</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed mb-3 line-clamp-2">
                  {ticket.description}
                </p>

                {/* Footer: user info + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium text-[var(--foreground)]">{ticket.users?.full_name}</span>
                      <span className="opacity-60">({ticket.users?.email})</span>
                    </div>
                    {ticket.workspaces?.name && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{ticket.workspaces.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {!showLog && ticket.status !== 'RESOLVED' && (
                      <>
                        {ticket.status === 'OPEN' && (
                          <button
                            onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')}
                            className="px-2.5 py-1 bg-[var(--background)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] hover:text-warning-text transition-colors flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> In Progress
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(ticket.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-[var(--background)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] hover:text-success-text dark:hover:text-success-text transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
