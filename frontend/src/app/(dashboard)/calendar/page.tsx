"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, Sparkles, X, Edit3, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ScheduledPost {
  id: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
  media_url?: string;
  created_at: string;
}

interface Recommendation {
  best_start_time: string;
  best_end_time: string;
  audience_timezone: string;
  user_local_time_start: string;
  user_local_time_end: string;
  confidence_score: number;
  reasoning: string;
  source: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const [topic, setTopic] = useState("");
  const [audienceRegion, setAudienceRegion] = useState("Global");
  const [audienceAgeGroup, setAudienceAgeGroup] = useState("All Ages");
  const [suggestedTimes, setSuggestedTimes] = useState<Recommendation[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("Instagram");
  const [userTimezone, setUserTimezone] = useState("UTC");

  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Recommendation | null>(null);
  const [scheduleContent, setScheduleContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);
    };
    checkAuth();
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) return;

      const response = await fetch('/api/v1/scheduler/posts?limit=100', {
        headers: { 'x-user-id': user.id }
      });
      const result = await response.json();
      if (result.success && result.posts) {
        setPosts(result.posts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      setPosts([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

  const handleMagicSchedule = async () => {
    if (!topic) {
      setMessage({ type: 'error', text: 'Please enter a topic for AI to analyze' });
      return;
    }

    setIsFetchingRecommendations(true);
    try {
      const response = await fetch('/api/v1/scheduler/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          niche: topic,
          audienceRegion,
          audienceAgeGroup,
          userTimezone
        })
      });
      const data = await response.json();
      if (response.ok && data.recommendations) {
        setSuggestedTimes(data.recommendations);
        setMessage({ type: 'success', text: 'AI generated optimal posting times for your audience' });
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to get recommendations';
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not connect to scheduling service' });
    }
    setIsFetchingRecommendations(false);
  };

  const handleScheduleFromRecommendation = (rec: Recommendation) => {
    setSelectedTimeSlot(rec);
    setScheduleContent("");
    setShowScheduleModal(true);
  };

  const handleCreateScheduledPost = async () => {
    if (!selectedTimeSlot || !scheduleContent.trim()) {
      setMessage({ type: 'error', text: 'Content is required' });
      return;
    }

    setCreatingPost(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const now = new Date();
      const [hours, minutes] = selectedTimeSlot.user_local_time_start.split(':');
      const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
      
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      const response = await fetch('/api/v1/scheduler/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          content: scheduleContent,
          platform: selectedPlatform,
          scheduledTime: scheduledDate.toISOString()
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowScheduleModal(false);
        setSelectedTimeSlot(null);
        setScheduleContent("");
        fetchScheduledPosts();
        setMessage({ type: 'success', text: 'Post scheduled successfully!' });
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to schedule post';
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to schedule post' });
    }
    setCreatingPost(false);
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(`/api/v1/scheduler/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          content: editingPost.content,
          scheduledTime: editingPost.scheduled_time
        })
      });
      const result = await response.json();
      if (result.success) {
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: editingPost.content, scheduled_time: editingPost.scheduled_time } : p));
        setShowEditModal(false);
        setMessage({ type: 'success', text: 'Post updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update post' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update post' });
    }
  };

  const handleCancelPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/v1/scheduler/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const result = await response.json();
      if (result.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
        setMessage({ type: 'success', text: 'Post cancelled successfully' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel post' });
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return posts.filter(p => p.scheduled_time.startsWith(dateStr));
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Content Calendar</h1>
        <p className="text-zinc-400 text-sm font-medium">Visualize and manage your scheduled posts across all platforms.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <h2 className="text-xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <button onClick={() => setCurrentDate(new Date())} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                Today
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-800">
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] bg-zinc-950/30 border-b border-r border-zinc-800/50" />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayPosts = getPostsForDay(day);
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                
                return (
                  <div key={day} className={`min-h-[120px] border-b border-r border-zinc-800/50 p-2 ${isToday ? 'bg-indigo-500/5' : 'bg-zinc-900/30'}`}>
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 2).map(post => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`w-full text-left text-xs p-1.5 rounded truncate transition-colors ${
                            post.status === 'SCHEDULED' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' :
                            post.status === 'PUBLISHED' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {post.platform}
                        </button>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-xs text-zinc-600">+{dayPosts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedPost && (
            <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Post Details</h3>
                <button onClick={() => setSelectedPost(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">
                    {selectedPost.platform}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedPost.status === 'SCHEDULED' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedPost.status === 'PUBLISHED' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {selectedPost.status}
                  </span>
                </div>
                <p className="text-zinc-300 text-sm">{selectedPost.content}</p>
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Clock className="w-4 h-4" />
                  {new Date(selectedPost.scheduled_time).toLocaleString()}
                </div>
                {selectedPost.status === 'SCHEDULED' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setEditingPost(selectedPost); setShowEditModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancelPost(selectedPost.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-sm font-bold rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              AI Scheduler
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Twitter">Twitter</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Topic / Niche</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. tech, fashion, fitness"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Target Audience Region</label>
                <select
                  value={audienceRegion}
                  onChange={(e) => setAudienceRegion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="Global">Global</option>
                  <option value="US (EST)">US (EST)</option>
                  <option value="US (PST)">US (PST)</option>
                  <option value="UK / Europe">UK / Europe</option>
                  <option value="Asia Pacific">Asia Pacific</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Target Age Group</label>
                <select
                  value={audienceAgeGroup}
                  onChange={(e) => setAudienceAgeGroup(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="All Ages">All Ages</option>
                  <option value="18-24">18-24 (Gen Z)</option>
                  <option value="25-34">25-34 (Millennials)</option>
                  <option value="35-44">35-44</option>
                  <option value="Professionals">Professionals</option>
                </select>
              </div>

              <div className="text-xs text-zinc-500">
                Your timezone: <span className="text-zinc-400 font-medium">{userTimezone}</span>
              </div>

              <button
                onClick={handleMagicSchedule}
                disabled={isFetchingRecommendations}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isFetchingRecommendations ? (
                  <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Get Optimal Times
              </button>
            </div>

            {suggestedTimes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h4 className="text-sm font-bold text-white mb-3">Recommended Times</h4>
                <div className="space-y-3">
                  {suggestedTimes.map((rec, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-indigo-400">
                          {rec.user_local_time_start} - {rec.user_local_time_end}
                        </span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                          {Math.round(rec.confidence_score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-1">
                        Audience time ({rec.audience_timezone}): {rec.best_start_time} - {rec.best_end_time}
                      </p>
                      <p className="text-xs text-zinc-400 italic mb-2">{rec.reasoning}</p>
                      <button
                        onClick={() => handleScheduleFromRecommendation(rec)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Schedule Post
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Upcoming ({posts.filter(p => p.status === 'SCHEDULED').length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {posts.filter(p => p.status === 'SCHEDULED').slice(0, 5).map(post => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400">{post.platform}</span>
                    <span className="text-xs text-zinc-600">
                      {new Date(post.scheduled_time).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{post.content}</p>
                </button>
              ))}
              {posts.filter(p => p.status === 'SCHEDULED').length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No scheduled posts</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Scheduled Post</h3>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Content</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 min-h-[120px]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={editingPost.scheduled_time.slice(0, 16)}
                  onChange={(e) => setEditingPost({ ...editingPost, scheduled_time: new Date(e.target.value).toISOString() })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdatePost}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Schedule Post</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Scheduled Time</span>
                </div>
                <p className="text-white font-medium">
                  {selectedTimeSlot.user_local_time_start} - {selectedTimeSlot.user_local_time_end} (Your time)
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  {selectedTimeSlot.best_start_time} - {selectedTimeSlot.best_end_time} ({selectedTimeSlot.audience_timezone})
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="text-sm text-zinc-400 mb-2">Platform</div>
                <p className="text-white font-medium">{selectedPlatform}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Post Content</label>
                <textarea
                  value={scheduleContent}
                  onChange={(e) => setScheduleContent(e.target.value)}
                  placeholder="Write your post content here..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 min-h-[120px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateScheduledPost}
                  disabled={creatingPost || !scheduleContent.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingPost ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  Schedule Post
                </button>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}