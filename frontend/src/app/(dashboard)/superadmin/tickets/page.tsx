'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  User,
  Globe,
  MoreVertical
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

  const getUrgencyColor = (urgency: string) => {
    if (urgency.includes('Critical')) return 'text-red-400 bg-red-400/10 border-red-500/20';
    if (urgency.includes('Urgent')) return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">OPEN</span>;
      case 'IN_PROGRESS': return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">IN PROGRESS</span>;
      case 'RESOLVED': return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">RESOLVED</span>;
      default: return <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
            <MessageSquare className="w-10 h-10 mr-4 text-indigo-500" />
            Support Inbox
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            Manage and resolve queries from Organization Admins.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-sm flex items-center hover:bg-zinc-800 transition-colors">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500">Scanning support queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
          <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-zinc-500">Inbox is empty</h3>
          <p className="text-zinc-600">All queries have been addressed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-zinc-700 transition-all">
              <div className="p-6 flex items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusBadge(ticket.status)}
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getUrgencyColor(ticket.urgency)}`}>
                      {ticket.urgency.split(' ')[0].toUpperCase()}
                    </span>
                    <span className="text-zinc-600 text-xs flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{ticket.subject}</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                    {ticket.description}
                  </p>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-xs text-zinc-500">
                      <User className="w-4 h-4 mr-2 text-indigo-400" />
                      <span className="font-bold text-zinc-300 mr-2">{ticket.users?.full_name}</span>
                      <span className="opacity-50">({ticket.users?.email})</span>
                    </div>
                    <div className="flex items-center text-xs text-zinc-500">
                      <Globe className="w-4 h-4 mr-2 text-emerald-400" />
                      <span className="font-bold text-zinc-300 uppercase tracking-tighter">{ticket.workspaces?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="ml-6 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')}
                    className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-amber-400 transition-colors"
                    title="Mark in progress"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => updateStatus(ticket.id, 'RESOLVED')}
                    className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400 transition-colors"
                    title="Mark resolved"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
