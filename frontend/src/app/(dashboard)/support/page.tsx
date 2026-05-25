'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  ExternalLink,
  Send,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      category: formData.get('category'),
      urgency: formData.get('urgency'),
      subject: formData.get('subject'),
      description: formData.get('description'),
    };

    try {
      await api.post('/api/v1/support/tickets', payload);
      setSubmitted(true);
    } catch (err) {
      console.error('Support submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
          <HelpCircle className="w-10 h-10 mr-4 text-indigo-500" />
          Help &amp; Support
        </h1>
        <p className="text-zinc-400 mt-2 text-lg">
          We&apos;re here to ensure your execution remains uninterrupted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-indigo-500/30 transition-all group">
          <Mail className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-bold mb-1">Email Support</h3>
          <p className="text-zinc-500 text-sm">Response within 24h</p>
          <a href="mailto:support@zoikovertex.com" className="text-indigo-400 text-xs mt-3 flex items-center hover:underline">
            support@zoikovertex.com <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
        
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-indigo-500/30 transition-all group">
          <MessageSquare className="w-8 h-8 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-bold mb-1">Live Chat</h3>
          <p className="text-zinc-500 text-sm">Available Mon-Fri</p>
          <button className="text-emerald-400 text-xs mt-3 flex items-center hover:underline">
            Open Chat Portal <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-indigo-500/30 transition-all group">
          <ShieldCheck className="w-8 h-8 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-bold mb-1">Security Report</h3>
          <p className="text-zinc-500 text-sm">Urgent vulnerabilities</p>
          <button className="text-amber-400 text-xs mt-3 flex items-center hover:underline">
            File Secure Report <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-1">Open a Support Ticket</h2>
          <p className="text-zinc-500 text-sm">Provide details about the issue you&apos;re encountering.</p>
        </div>

        {submitted ? (
          <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Request Received</h3>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Your support ticket has been prioritized. An expert from the ZoikoVertex team will contact you shortly.
            </p>
            <button 
              onClick={() => setSubmitted(false)}
              className="mt-8 text-indigo-400 font-medium hover:underline"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Issue Category</label>
                <select name="category" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  <option>Authentication Issue</option>
                  <option>Organization Management</option>
                  <option>Social Posting Error</option>
                  <option>Governance Workflow</option>
                  <option>General Feedback</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Urgency Level</label>
                <select name="urgency" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-amber-500">
                  <option>Standard (Normal operations)</option>
                  <option>Urgent (Execution blocked)</option>
                  <option>Critical (Security/System down)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
              <input 
                name="subject"
                type="text" 
                placeholder="Brief summary of the issue"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
              <textarea 
                name="description"
                rows={5}
                placeholder="Please describe exactly what happened..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                required
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Support Request
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
