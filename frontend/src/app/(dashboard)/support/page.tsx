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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 sm:pb-4">
        <h1 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-[var(--accent)]" />
          Help &amp; Support
        </h1>
        <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-0.5">
          Get assistance from the ZoikoVertex team
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
          <Mail className="w-5 h-5 text-[var(--accent)] mb-2" />
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-0.5">Email Support</h3>
          <p className="text-xs text-[var(--foreground-muted)] mb-2">Response within 24 hours</p>
          <a href="mailto:support@zoikovertex.com" className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1">
            support@zoikovertex.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
          <MessageSquare className="w-5 h-5 text-[var(--accent)] mb-2" />
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-0.5">Live Chat</h3>
          <p className="text-xs text-[var(--foreground-muted)] mb-2">Available Mon–Fri</p>
          <button onClick={() => window.dispatchEvent(new Event('toggle-chatbot'))} className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1">
            Open Chat Portal <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* Ticket Form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Open a Support Ticket</h2>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Provide details about the issue you&apos;re encountering</p>
        </div>

        {submitted ? (
          <div className="py-10 sm:py-12 px-4 sm:px-6 text-center">
            <div className="w-12 h-12 bg-success-bg dark:bg-success-text/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-success-text dark:text-success-text" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Request Received</h3>
            <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto mb-5">
              Your support ticket has been queued. Our team will follow up shortly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm text-[var(--accent)] hover:underline font-medium"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Category</label>
                <select name="category" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors">
                  <option>Authentication Issue</option>
                  <option>Organization Management</option>
                  <option>Social Posting Error</option>
                  <option>Governance Workflow</option>
                  <option>General Feedback</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Urgency</label>
                <select name="urgency" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors">
                  <option>Standard (Normal operations)</option>
                  <option>Urgent (Execution blocked)</option>
                  <option>Critical (Security/System down)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Subject</label>
              <input
                name="subject"
                type="text"
                placeholder="Brief summary of the issue"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Description</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe what happened in detail"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-foreground text-sm font-medium rounded-md transition-colors flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
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
