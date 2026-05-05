"use client";

import { useState } from "react";
import { Upload, Sparkles, Clock, CheckCircle2, AlertCircle, Image as ImageIcon, Video, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PublishPage() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Entertainment");
  const [platforms, setPlatforms] = useState({ facebook: true, instagram: false, linkedin: false });
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // AI State
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const [suggestedTimes, setSuggestedTimes] = useState<{time: string, label: string}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('immediate');

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  const handleGenerateAI = async () => {
    if (!topic) return;
    setGenerating(true);
    
    // Hit our backend AI route
    try {
      const response = await fetch('http://localhost:5000/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          contentType,
          platforms: Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k)
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        setDescription(data.description);
        setSuggestedTimes(data.suggestedTimes);
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Generation Failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Backend AI connection failed. Ensure server is running.' });
    }
    setGenerating(false);
  };

  const handleSubmitIntent = async () => {
    if (!description || !media) {
      setMessage({ type: 'error', text: 'Media and Description are required to submit.' });
      return;
    }
    
    setSubmitting(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload media to Supabase Storage
      const fileExt = media.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, media);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 2. Insert the intent with the public URL
      const { error } = await supabase.from('publish_intents').insert({
        workspace_id: (await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()).data?.workspace_id,
        creator_id: user.id,
        content: description,
        platform: Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k).join(', '),
        status: 'PENDING',
        scheduled_for: selectedTime === 'immediate' ? new Date().toISOString() : selectedTime,
        media_url: publicUrl // We need to ensure this column exists
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Post successfully submitted to Manager for approval!' });
      // Reset form
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null); setSuggestedTimes([]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    
    setSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Social Publisher</h1>
        <p className="text-zinc-400 text-sm">Draft, optimize with AI, and submit content for governance approval.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Content Creation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Media Upload */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Media Assets</h2>
            
            {!mediaPreview ? (
              <label className="w-full h-48 border-2 border-dashed border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
                <div className="flex items-center gap-4 mb-2">
                  <ImageIcon className="w-6 h-6 text-zinc-500" />
                  <Video className="w-6 h-6 text-zinc-500" />
                </div>
                <span className="text-sm font-medium text-zinc-300">Click to upload Image or Video</span>
                <span className="text-xs text-zinc-500 mt-1">MP4, JPG, PNG (Max 50MB)</span>
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                {media?.type.startsWith('video') ? (
                  <video src={mediaPreview} controls className="max-h-full max-w-full" />
                ) : (
                  <img src={mediaPreview} className="object-contain max-h-full" />
                )}
                <button 
                  onClick={() => { setMedia(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* AI Generator Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Description Writer
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">What is this post about?</label>
                  <input 
                    type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Launching our new summer collection"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Content Type</label>
                  <input 
                    type="text" 
                    list="content-types"
                    value={contentType} 
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder="e.g. Health & Fitness"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <datalist id="content-types">
                    <option value="Entertainment" />
                    <option value="Music" />
                    <option value="Technology" />
                    <option value="Education" />
                    <option value="Business" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Target Platforms</label>
                <div className="flex gap-3">
                  {Object.entries(platforms).map(([key, active]) => (
                    <button
                      key={key}
                      onClick={() => setPlatforms({...platforms, [key]: !active})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        active ? 'bg-indigo-600 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerateAI} disabled={generating || !topic}
              className="w-full flex items-center justify-center py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "Synthesizing..." : "Generate Magic Description & Peak Times"}
            </button>

            {description && (
              <div className="mt-6">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Generated Content</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-sm leading-relaxed resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scheduling & Action */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Scheduling Logic
            </h2>

            {suggestedTimes.length > 0 ? (
              <div className="space-y-3 mb-6">
                <p className="text-xs text-zinc-400 mb-2">AI Suggested Peak Times for {contentType}:</p>
                {suggestedTimes.map((slot, i) => (
                  <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === slot.time ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                    <input 
                      type="radio" name="schedule" 
                      checked={selectedTime === slot.time}
                      onChange={() => setSelectedTime(slot.time)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${selectedTime === slot.time ? 'text-indigo-400' : 'text-white'}`}>{slot.time}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{slot.label}</p>
                    </div>
                    {selectedTime === slot.time && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 p-4 bg-zinc-950 rounded-xl border border-zinc-800 mb-6 text-center">
                Generate AI content to see calculated peak time slots.
              </div>
            )}

            <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === 'immediate' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <input 
                type="radio" name="schedule" 
                checked={selectedTime === 'immediate'}
                onChange={() => setSelectedTime('immediate')}
                className="hidden"
              />
              <div className="flex-1">
                <p className={`text-sm font-bold ${selectedTime === 'immediate' ? 'text-emerald-400' : 'text-white'}`}>Post Immediately</p>
                <p className="text-xs text-zinc-500 mt-0.5">Executes upon manager approval</p>
              </div>
              {selectedTime === 'immediate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </label>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Governance</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              All published content must pass through the Approval Queue. Immediate posts will execute the moment a Manager authorizes them.
            </p>

            {message && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <button 
              onClick={handleSubmitIntent} disabled={submitting || !media || !description}
              className="w-full flex items-center justify-center py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit to Manager"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
