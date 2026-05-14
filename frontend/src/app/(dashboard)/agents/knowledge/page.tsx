"use client";

import { useState, useEffect } from "react";
import { 
  Brain, 
  Palette, 
  BookOpen, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  FileText, 
  ChevronRight,
  Loader2,
  Globe,
  ShieldCheck,
  Search,
  MoreVertical,
  X,
  PlusCircle,
  FileCode,
  Info,
  Upload,
  FileDigit,
  HelpCircle,
  Sparkles,
  Mic2,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Type as TypeIcon,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";

type KBType = 'AI_LIBRARY' | 'BRAND_GUIDELINES' | 'SOP';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: KBType;
  created_at: string;
}

interface KnowledgeEntry {
  id: string;
  kb_id: string;
  title: string;
  content: string;
  source_url?: string;
  file_path?: string;
  created_at: string;
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<KBType>('AI_LIBRARY');
  const [loading, setLoading] = useState(true);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [fetchingEntries, setFetchingEntries] = useState(false);
  
  // Modals
  const [showCreateBase, setShowCreateBase] = useState(false);
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [newBaseDesc, setNewBaseDesc] = useState("");
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryContent, setNewEntryContent] = useState("");
  const [newEntryUrl, setNewEntryUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [creatingBase, setCreatingBase] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Brand Asset States
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [fontFamily, setFontFamily] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/v1/knowledge/bases');
      if (result.success) {
        setBases(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch knowledge bases", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (baseId: string) => {
    setFetchingEntries(true);
    try {
      const result = await api.get(`/api/v1/knowledge/bases/${baseId}/entries`);
      if (result.success) {
        setEntries(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch entries", err);
    } finally {
      setFetchingEntries(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBase = async () => {
    if (!newBaseName) return;
    setCreatingBase(true);
    try {
      const result = await api.post('/api/v1/knowledge/bases', {
        name: newBaseName,
        description: newBaseDesc,
        type: activeTab
      });
      if (result.success) {
        setBases([result.data, ...bases]);
        setShowCreateBase(false);
        setNewBaseName("");
        setNewBaseDesc("");
      }
    } catch (err) {
      console.error("Failed to create base", err);
    } finally {
      setCreatingBase(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!selectedBase || (!newEntryTitle && !selectedFile)) return;
    setCreatingEntry(true);
    try {
      const formData = new FormData();
      formData.append('title', newEntryTitle);
      formData.append('content', newEntryContent);
      formData.append('source_url', newEntryUrl);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      // Add visual metadata if applicable
      const metadataObj: any = {};
      if (selectedBase?.type === 'BRAND_GUIDELINES') {
        metadataObj.visual_identity = {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          visual_style: visualStyle,
          font_family: fontFamily
        };
      }

      formData.append('metadata', JSON.stringify(metadataObj));

      const result = await api.postMultipart(`/api/v1/knowledge/bases/${selectedBase.id}/entries`, formData);

      if (result.success) {
        setEntries([result.data, ...entries]);
        setShowCreateEntry(false);
        setNewEntryTitle("");
        setNewEntryContent("");
        setNewEntryUrl("");
        setSelectedFile(null);
        // Reset brand visual states
        setPrimaryColor("");
        setSecondaryColor("");
        setVisualStyle("");
        setFontFamily("");
      }
    } catch (err) {
      console.error("Failed to create entry", err);
    } finally {
      setCreatingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Remove this entry from the knowledge base?")) return;
    try {
      await api.delete(`/api/v1/knowledge/entries/${entryId}`);
      setEntries(entries.filter(e => e.id !== entryId));
    } catch (err) {
      console.error("Failed to delete entry", err);
    }
  };

  const currentBases = bases.filter(b => b.type === activeTab);

  const tabs = [
    { id: 'AI_LIBRARY', label: 'AI Library', icon: Brain, desc: 'Train models with your data' },
    { id: 'BRAND_GUIDELINES', label: 'Brand Center', icon: Palette, desc: 'Define your voice and identity' },
    { id: 'SOP', label: 'Operations', icon: BookOpen, desc: 'Standard Operating Procedures' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Enterprise Knowledge Bases</h1>
          <p className="text-zinc-500 mt-1 font-medium">Govern the core intelligence and procedures of your organization.</p>
        </div>
        <button 
          onClick={() => setShowGuide(!showGuide)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-xs ${
            showGuide 
              ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" 
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          QUICK GUIDE
          {showGuide ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Quick Guide Card */}
      {showGuide && (
        <div className="bg-zinc-900/50 border border-indigo-500/20 rounded-[2rem] p-8 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">AI Library (The Brain)</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  The "textbooks" for your AI. Upload raw data, company history, and product details so the AI knows exactly what your business does without guessing.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl w-fit text-purple-400">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Brand Center (The Voice)</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  The "personality manual." Define how you sound (professional, bold, or friendly) to ensure every AI-generated post matches your official brand identity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Operations (The Rules)</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  The "instruction booklets." Store your SOPs and workflow rules here so the AI follows your company's specific procedures for every single task.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as KBType);
              setSelectedBase(null);
            }}
            className={`flex-1 min-w-[200px] p-6 rounded-3xl border transition-all text-left relative overflow-hidden group ${
              activeTab === tab.id 
                ? "bg-zinc-900 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                : "bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700"
            }`}
          >
            <div className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${
              activeTab === tab.id ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
            }`}>
              <tab.icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className={`font-black text-lg ${activeTab === tab.id ? "text-white" : "text-zinc-400"}`}>{tab.label}</h3>
              <p className="text-xs text-zinc-500 font-medium">{tab.desc}</p>
            </div>
            {activeTab === tab.id && (
              <div className="absolute top-4 right-4">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Base List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Available Bases</h2>
            <button 
              onClick={() => setShowCreateBase(true)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : currentBases.length > 0 ? (
              currentBases.map(base => (
                <button
                  key={base.id}
                  onClick={() => {
                    setSelectedBase(base);
                    fetchEntries(base.id);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all group ${
                    selectedBase?.id === base.id 
                      ? "bg-indigo-500/5 border-indigo-500/30" 
                      : "bg-zinc-900/20 border-zinc-800/50 hover:bg-zinc-800/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${selectedBase?.id === base.id ? "text-white" : "text-zinc-300"}`}>{base.name}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedBase?.id === base.id ? "translate-x-1 text-indigo-400" : "text-zinc-600"}`} />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">{base.description || "No description provided."}</p>
                </button>
              ))
            ) : (
              <div className="p-10 text-center border border-dashed border-zinc-800 rounded-3xl">
                <p className="text-xs text-zinc-600 font-medium">No bases defined for this category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Entry Detail */}
        <div className="lg:col-span-8">
          {selectedBase ? (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedBase.name}</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-1">{selectedBase.description}</p>
                </div>
                <button 
                  onClick={() => setShowCreateEntry(true)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  NEW ENTRY
                </button>
              </div>

              <div className="flex-1 p-8">
                {fetchingEntries ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Retrieving entries...</span>
                  </div>
                ) : entries.length > 0 ? (
                  <div className="space-y-4">
                    {entries.map(entry => (
                      <div key={entry.id} className="group bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                              {entry.source_url ? (
                                <Globe className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-400" />
                              )}
                              <h3 className="font-bold text-white">{entry.title}</h3>
                            </div>
                            
                            {entry.content && (
                              <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{entry.content}</p>
                            )}

                            {entry.source_url && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg w-fit">
                                <LinkIcon className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] text-zinc-500 font-medium">{entry.source_url}</span>
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                    <div className="p-6 bg-zinc-800/50 rounded-full">
                      <FileCode className="w-12 h-12 text-zinc-600" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-sm font-bold text-white mb-1">Base is currently empty</h3>
                      <p className="text-xs text-zinc-500">Populate this knowledge base with documents, links, or internal procedures.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] border border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center text-zinc-700">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="max-w-sm space-y-2">
                <h2 className="text-xl font-bold text-white">Select a Knowledge Base</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">Choose an available resource from the list on the left to manage entries, guidelines, or SOP documentation.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Base */}
      {showCreateBase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">New Knowledge Base</h3>
              <button onClick={() => setShowCreateBase(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Base Name</label>
                <input 
                  value={newBaseName}
                  onChange={(e) => setNewBaseName(e.target.value)}
                  placeholder="e.g. Q4 Marketing Guidelines"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description (Optional)</label>
                <textarea 
                  value={newBaseDesc}
                  onChange={(e) => setNewBaseDesc(e.target.value)}
                  placeholder="Describe the purpose of this knowledge base..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                />
              </div>
              <button 
                onClick={handleCreateBase}
                disabled={creatingBase || !newBaseName}
                className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20"
              >
                {creatingBase ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    INITIALIZING...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    INITIALIZE BASE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Entry */}
      {showCreateEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Add Information Entry</h3>
              </div>
              <button onClick={() => setShowCreateEntry(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Title / Headline</label>
                <input 
                  value={newEntryTitle}
                  onChange={(e) => setNewEntryTitle(e.target.value)}
                  placeholder="e.g. Tone of Voice - Professional"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Source URL (Optional)</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                    <input 
                      value={newEntryUrl}
                      onChange={(e) => setNewEntryUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Classification</label>
                  <div className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Internal Metadata
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Document Upload (PDF, DOCX, TXT, MD)</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full bg-zinc-950 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${
                    selectedFile ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800 group-hover:border-zinc-700"
                  }`}>
                    {selectedFile ? (
                      <>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                          <FileDigit className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-tighter">{(selectedFile.size / 1024).toFixed(1)} KB • Ready to extract</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-zinc-400">Click to upload or drag & drop</p>
                          <p className="text-[10px] text-zinc-600 mt-1 uppercase font-black tracking-tighter text-wrap max-w-[200px]">Data will be automatically extracted and indexed for AI training</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Brand Assets (Only for Brand Guidelines) */}
              {selectedBase?.type === 'BRAND_GUIDELINES' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="relative py-4 flex items-center gap-4">
                    <div className="flex-1 h-px bg-zinc-800/50" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Visual Identity Assets</span>
                    <div className="flex-1 h-px bg-zinc-800/50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Primary HEX</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-zinc-800" style={{ backgroundColor: primaryColor || 'transparent' }} />
                        <input 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#000000"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secondary HEX</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-zinc-800" style={{ backgroundColor: secondaryColor || 'transparent' }} />
                        <input 
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Typography / Fonts</label>
                      <div className="relative">
                        <TypeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                        <input 
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          placeholder="e.g. Inter, Roboto"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Style Keywords</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                        <input 
                          value={visualStyle}
                          onChange={(e) => setVisualStyle(e.target.value)}
                          placeholder="e.g. Minimal, Vibrant"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative py-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800/50" />
                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">OR MANUALLY ENTER</span>
                <div className="flex-1 h-px bg-zinc-800/50" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Content / Body</label>
                <textarea 
                  value={newEntryContent}
                  onChange={(e) => setNewEntryContent(e.target.value)}
                  placeholder="Enter specific guidelines, policy text, or instructions if not uploading a file..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500 transition-all h-32 resize-none text-sm"
                  disabled={!!selectedFile}
                />
              </div>

              <button 
                onClick={handleCreateEntry}
                disabled={creatingEntry || (!newEntryTitle && !selectedFile)}
                className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {creatingEntry ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    EXTRACTING & SAVING...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    COMMIT ENTRY TO BASE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
