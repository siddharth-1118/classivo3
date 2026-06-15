"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, MapPin, Clock, X, Camera, ChevronDown, Loader2, 
  ArrowLeft, Bell, Home, Briefcase, FileText, CheckCircle, MessageSquare, 
  Trash2, User, Trophy, Calendar, Phone, Award, Send, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";

// --- constants ---
const NEST_URL = process.env.NEXT_PUBLIC_NEST_URL || "https://classivo3.onrender.com";
const SSO_SECRET = process.env.NEXT_PUBLIC_SSO_SECRET || "classivo_internal_secret_token_123";

const CATEGORIES = [
  "ID Card", "Keys", "Bottle", "Charger", "Wallet", "Bag", "Earphones", "Books", "Laptop", "Mobile", "Other"
];

const LOCATIONS = [
  "Main Block", "Library", "Canteen", "Hostel Block A", "Hostel Block B", 
  "Hostel Block C", "Hostel Block D", "Ground", "Parking", "Lab", "Bus Stop", "Other"
];

const CAMPUSES = ["KTR", "Ramapuram", "Vadapalani", "NCR"];

interface LostFoundItem {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category: string;
  location: string;
  date_time: string;
  contact_preference?: string;
  verification_question?: string;
  verification_answer?: string;
  user_email?: string;
  status: "Active" | "Claimed" | "Resolved";
  photo_url?: string; // Stored as a JSON string array of URLs
  campus?: string;
  resolved_at?: string;
  created_at: string;
}

interface Claim {
  id: string;
  item_id: string;
  claimer_email: string;
  answer: string;
  status: "Pending" | "Accepted" | "Rejected";
  created_at: string;
  users?: {
    name: string;
    department?: string;
  };
}

interface Message {
  id: string;
  claim_id: string;
  sender_email: string;
  content: string;
  created_at: string;
  users?: {
    name: string;
  };
}

interface ChatThread {
  id: string;
  item_id: string;
  claimer_email: string;
  status: string;
  created_at: string;
  items: {
    title: string;
    type: string;
    location: string;
    user_email: string;
  };
  users: {
    name: string;
  };
}

// --- helper UI components matching mockup ---
const GlassInput = ({ label, placeholder, value, onChange, type = "text" }: any) => (
  <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5 focus-within:border-[#6EE7F7]/50 focus-within:bg-[#0f131f]/40 focus-within:shadow-[0_0_15px_rgba(110,231,247,0.1)] transition-all duration-200">
    <span className="text-xs font-semibold text-slate-400/90 tracking-wide">{label}</span>
    <div className="w-full h-[1px] bg-white/10" />
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none w-full py-1.5"
    />
  </div>
);

const GlassTextArea = ({ label, placeholder, value, onChange, rows = 3 }: any) => (
  <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5 focus-within:border-[#6EE7F7]/50 focus-within:bg-[#0f131f]/40 focus-within:shadow-[0_0_15px_rgba(110,231,247,0.1)] transition-all duration-200">
    <span className="text-xs font-semibold text-slate-400/90 tracking-wide">{label}</span>
    <div className="w-full h-[1px] bg-white/10" />
    <textarea 
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none w-full py-1.5 resize-none leading-relaxed"
    />
  </div>
);

const GlassSelect = ({ label, value, onChange, options, placeholder }: any) => (
  <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5 focus-within:border-[#6EE7F7]/50 focus-within:bg-[#0f131f]/40 focus-within:shadow-[0_0_15px_rgba(110,231,247,0.1)] transition-all duration-200 relative">
    <span className="text-xs font-semibold text-slate-400/90 tracking-wide">{label}</span>
    <div className="w-full h-[1px] bg-white/10" />
    <div className="relative w-full">
      <select 
        value={value}
        onChange={onChange}
        className="w-full bg-transparent text-sm text-white/80 outline-none appearance-none py-1.5 cursor-pointer"
      >
        {placeholder && <option value="" disabled style={{ background: "#0a0d17" }}>{placeholder}</option>}
        {options.map((opt: string) => (
          <option key={opt} value={opt} style={{ background: "#0a0d17" }}>{opt}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
    </div>
  </div>
);

const GlassDateTime = ({ label, value, onChange }: any) => (
  <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5 focus-within:border-[#6EE7F7]/50 focus-within:bg-[#0f131f]/40 focus-within:shadow-[0_0_15px_rgba(110,231,247,0.1)] transition-all duration-200">
    <span className="text-xs font-semibold text-slate-400/90 tracking-wide">{label}</span>
    <div className="w-full h-[1px] bg-white/10" />
    <input 
      type="datetime-local"
      value={value}
      onChange={onChange}
      className="bg-transparent text-sm text-white outline-none w-full py-1.5 cursor-pointer scheme-dark"
    />
  </div>
);

export default function LostFoundModule() {
  const { userData } = useApp();
  const userEmail = userData?.profile?.email || "";
  const userName = userData?.profile?.name || "Student";
  const userDept = userData?.profile?.dept || "";

  // Navigation state
  const [activeTab, setActiveTab] = useState<"feed" | "search" | "post" | "my-posts" | "profile">("feed");
  
  // Data state
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ssoToken, setSsoToken] = useState<string>("");

  // Selected item detail overlay
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);

  // Active chat thread overlay
  const [activeChatThread, setActiveChatThread] = useState<ChatThread | null>(null);

  // Fetch SSO token from Express backend to authorize API requests
  useEffect(() => {
    const fetchSsoToken = async () => {
      if (!userEmail) return;
      try {
        const res = await fetch(`${NEST_URL}/api/auth/sso`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "bypass-tunnel-reminder": "true"
          },
          body: JSON.stringify({ 
            email: userEmail,
            profile: userData?.profile || {},
            secret: SSO_SECRET
          })
        });
        const data = await res.json();
        if (data.success && data.token) {
          setSsoToken(data.token);
        }
      } catch (err) {
        console.error("Failed to fetch SSO token:", err);
      }
    };
    fetchSsoToken();
  }, [userEmail, userData]);

  // Refresh data trigger
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle pull to refresh simulated action
  const handlePullRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  return (
    <div className="w-full min-h-screen flex flex-col text-theme-text bg-[#0a0d17] relative overflow-hidden font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] bg-cyan-400/3 rounded-full blur-[80px] pointer-events-none" />
      
      {/* CSS Styles injection for animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .shake-element {
          animation: shake 0.5s ease-in-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(110, 231, 247, 0.3);
          border-radius: 10px;
        }
      `}</style>

      {/* ── Header ── */}
      <header className="px-5 pt-12 pb-4 flex justify-between items-center shrink-0 border-b border-white/5 relative z-40 bg-[#0a0d17]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.href = "/"}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 active:scale-90 transition-transform border border-white/10"
          >
            <ArrowLeft size={18} style={{ color: "#E2C974" }} />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E2C974]/60 font-title-md">Classivo</span>
            <span className="text-xl font-black tracking-tight text-white">Lost & Found</span>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 active:scale-90 transition-transform border border-white/10 relative">
          <Bell size={18} className="text-white/70" />
          <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E2C974] animate-pulse" />
        </button>
      </header>

      {/* ── Main Scrollable Area ── */}
      <main
        className="flex-1 overflow-y-auto no-scrollbar relative z-10 px-5 pt-4"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        {loading && !refreshing ? (
          <div className="w-full py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#6EE7F7]" size={36} />
            <span className="text-sm font-bold uppercase tracking-widest text-[#6ee7f7]/60">Synchronizing...</span>
          </div>
        ) : (
          <>
            {activeTab === "feed" && (
              <FeedTab 
                items={items} 
                onSelect={setSelectedItem} 
                onRefresh={handlePullRefresh} 
                refreshing={refreshing}
                onOpenPost={() => setActiveTab("post")}
              />
            )}
            {activeTab === "search" && (
              <SearchTab 
                items={items} 
                onSelect={setSelectedItem} 
              />
            )}
            {activeTab === "post" && (
              <PostTab 
                userEmail={userEmail} 
                onSuccess={() => { fetchAllData(); setActiveTab("feed"); }} 
              />
            )}
            {activeTab === "my-posts" && (
              <MyPostsTab 
                items={items} 
                userEmail={userEmail}
                onSelect={setSelectedItem}
                onOpenChat={setActiveChatThread}
                onRefresh={fetchAllData}
                ssoToken={ssoToken}
              />
            )}
            {activeTab === "profile" && (
              <ProfileTab 
                items={items} 
                userEmail={userEmail}
                userName={userName}
                userDept={userDept}
              />
            )}
          </>
        )}
      </main>

      {/* ── Detail Page Overlay ── */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailOverlay 
            item={selectedItem} 
            userEmail={userEmail} 
            onClose={() => setSelectedItem(null)} 
            onOpenChat={(thread) => { setSelectedItem(null); setActiveChatThread(thread); }}
            onRefresh={fetchAllData}
            ssoToken={ssoToken}
          />
        )}
      </AnimatePresence>

      {/* ── Chat Thread Overlay ── */}
      <AnimatePresence>
        {activeChatThread && (
          <ChatThreadOverlay 
            thread={activeChatThread} 
            userEmail={userEmail} 
            onClose={() => setActiveChatThread(null)}
            onRefresh={fetchAllData}
            ssoToken={ssoToken}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom Navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0a0d17] via-[#0a0d17]/95 to-transparent pt-8"
        style={{
          padding: "1rem",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))"
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto bg-slate-900/60 backdrop-blur-xl rounded-full px-3 py-2 border border-white/10 shadow-2xl shadow-cyan-500/5">
          {[
            { id: "feed", label: "feed", Icon: Home },
            { id: "search", label: "search", Icon: Search },
            { id: "post", label: "report", Icon: Plus },
            { id: "my-posts", label: "activity", Icon: FileText },
            { id: "profile", label: "stats", Icon: User }
          ].map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 relative ${
                  isActive 
                    ? "bg-[#6EE7F7] text-slate-950 shadow-[0_0_15px_rgba(110,231,247,0.35)] scale-102" 
                    : "text-white/40 active:text-white/70 hover:text-white/60"
                }`}
                style={{ minWidth: "64px" }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 📌 SUB-VIEW 1: FEED TAB
// ────────────────────────────────────────────────────────
function FeedTab({ 
  items, onSelect, onRefresh, refreshing, onOpenPost 
}: { 
  items: LostFoundItem[]; 
  onSelect: (i: LostFoundItem) => void; 
  onRefresh: () => void; 
  refreshing: boolean;
  onOpenPost: () => void;
}) {
  const [feedType, setFeedType] = useState<"LOST" | "FOUND">("LOST");

  const filtered = items.filter(i => i.type === feedType && i.status !== "Resolved");

  return (
    <div className="flex flex-col gap-5">
      {/* Feed Toggle Controls */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex gap-2.5 bg-white/[0.03] p-1 rounded-full border border-white/[0.06]">
          <button
            onClick={() => setFeedType("LOST")}
            className={`px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              feedType === "LOST" ? "bg-[#6EE7F7] text-slate-950 shadow-lg shadow-[#6EE7F7]/25 scale-105" : "text-white/50 hover:text-white"
            }`}
          >
            Lost Items
          </button>
          <button
            onClick={() => setFeedType("FOUND")}
            className={`px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              feedType === "FOUND" ? "bg-[#6EE7F7] text-slate-950 shadow-lg shadow-[#6EE7F7]/25 scale-105" : "text-white/50 hover:text-white"
            }`}
          >
            Found Items
          </button>
        </div>
        <button 
          onClick={onRefresh}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 border border-white/[0.06] transition-transform"
        >
          <RefreshCw size={18} className={`text-white/60 ${refreshing ? "animate-spin text-[#6EE7F7]" : ""}`} />
        </button>
      </div>

      {/* Grid List */}
      {filtered.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white/5 mb-5 border border-white/5">
            <Briefcase size={28} className="text-white/30" />
          </div>
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest">No reports found</p>
          <p className="text-xs text-white/30 mt-2 max-w-xs leading-relaxed">Be the first to create a report by tapping the floating action button below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>
      )}

      {/* Floating post trigger */}
      <button
        onClick={onOpenPost}
        className="fixed right-6 w-14 h-14 rounded-full flex items-center justify-center bg-[#6EE7F7] text-slate-950 shadow-xl shadow-[#6EE7F7]/35 active:scale-90 transition-transform z-35"
        style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// Helper Card Component
function ItemCard({ item, onClick }: { item: LostFoundItem; onClick: () => void }) {
  // Parse photo URLs array
  let photosList: string[] = [];
  if (item.photo_url) {
    try {
      const parsed = JSON.parse(item.photo_url);
      photosList = Array.isArray(parsed) ? parsed : [item.photo_url];
    } catch {
      photosList = [item.photo_url];
    }
  }

  const hasPhoto = photosList.length > 0 && photosList[0].startsWith("http");

  return (
    <div 
      onClick={onClick}
      className="w-full rounded-3xl p-6 flex gap-6 cursor-pointer bg-[#0f131f]/40 backdrop-blur-xl border border-white/5 hover:border-[#6EE7F7]/30 hover:bg-[#0f131f]/60 active:scale-[0.98] transition-all duration-300 shadow-2xl relative overflow-hidden"
    >
      {/* Left side: Photo preview */}
      <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 bg-white/5 border border-white/10 flex items-center justify-center relative shadow-inner">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photosList[0]} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Camera size={24} className="text-white/25" />
        )}
      </div>

      {/* Right side: details */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex justify-between items-start gap-3 mb-1.5">
            <h3 className="text-lg font-bold text-[#f8fafc] font-title-md leading-snug truncate">{item.title}</h3>
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
              item.status === "Active" 
                ? "bg-[#2ECC71]/15 text-[#2ECC71]" 
                : item.status === "Claimed"
                  ? "bg-[#F1C40F]/15 text-[#F1C40F]"
                  : "bg-white/15 text-white/40"
            }`}>
              {item.status}
            </span>
          </div>
          <div className="flex gap-2 items-center mb-2">
            <span className="text-[11px] font-medium tracking-wide px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {item.category}
            </span>
            {item.campus && (
              <span className="text-[11px] font-medium tracking-wide px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[#6ee7f7]">
                {item.campus} Campus
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300/80 font-body line-clamp-2 leading-relaxed mt-2">{item.description}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400/70 pt-3 border-t border-white/5 mt-3">
          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
            <MapPin size={12} className="text-[#6EE7F7]" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock size={12} />
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 📌 SUB-VIEW 2: SEARCH TAB
// ────────────────────────────────────────────────────────
function SearchTab({ items, onSelect }: { items: LostFoundItem[]; onSelect: (i: LostFoundItem) => void }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [campus, setCampus] = useState("");

  const filtered = items.filter(i => {
    // Keyword match
    if (keyword && !i.title.toLowerCase().includes(keyword.toLowerCase()) && !i.description.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    // Category match
    if (category && i.category !== category) return false;
    // Location match
    if (location && i.location !== location) return false;
    // Type match
    if (type && i.type !== type) return false;
    // Status match
    if (status && i.status !== status) return false;
    // Campus match
    if (campus && i.campus !== campus) return false;

    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Keyword input */}
      <div className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 focus-within:border-cyan-500/50 focus-within:bg-[#0f131f]/40 focus-within:shadow-[0_0_15px_rgba(110,231,247,0.1)] transition-all duration-300">
        <Search size={18} className="text-white/40 shrink-0" />
        <input 
          type="text" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="search by name, details..."
          className="flex-1 bg-transparent text-base font-normal outline-none text-white placeholder:text-white/40"
        />
      </div>

      {/* Grid of dropdown filters */}
      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="relative">
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#0f131f]/40 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-200 outline-none appearance-none transition-all duration-200 cursor-pointer"
          >
            <option value="" style={{ background: "#0a0d17" }}>All Types</option>
            <option value="LOST" style={{ background: "#0a0d17" }}>LOST</option>
            <option value="FOUND" style={{ background: "#0a0d17" }}>FOUND</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
        </div>

        {/* Status */}
        <div className="relative">
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-[#0f131f]/40 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-200 outline-none appearance-none transition-all duration-200 cursor-pointer"
          >
            <option value="" style={{ background: "#0a0d17" }}>All Statuses</option>
            <option value="Active" style={{ background: "#0a0d17" }}>Active</option>
            <option value="Claimed" style={{ background: "#0a0d17" }}>Claimed</option>
            <option value="Resolved" style={{ background: "#0a0d17" }}>Resolved</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
        </div>

        {/* Category */}
        <div className="relative">
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#0f131f]/40 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-200 outline-none appearance-none transition-all duration-200 cursor-pointer"
          >
            <option value="" style={{ background: "#0a0d17" }}>All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat} style={{ background: "#0a0d17" }}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
        </div>

        {/* Location */}
        <div className="relative">
          <select 
            value={location} 
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-[#0f131f]/40 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-200 outline-none appearance-none transition-all duration-200 cursor-pointer"
          >
            <option value="" style={{ background: "#0a0d17" }}>All Locations</option>
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc} style={{ background: "#0a0d17" }}>{loc}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
        </div>

        {/* Campus */}
        <div className="relative col-span-2">
          <select 
            value={campus} 
            onChange={(e) => setCampus(e.target.value)}
            className="w-full bg-[#0f131f]/40 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-200 outline-none appearance-none transition-all duration-200 cursor-pointer"
          >
            <option value="" style={{ background: "#0a0d17" }}>All Campuses</option>
            {CAMPUSES.map(cam => (
              <option key={cam} value={cam} style={{ background: "#0a0d17" }}>{cam} Campus</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
        </div>
      </div>

      {/* Results header */}
      <div className="flex justify-between items-center mt-2 border-b border-white/[0.06] pb-2.5">
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Results ({filtered.length})</span>
        {(keyword || category || location || type || status || campus) && (
          <button 
            onClick={() => { setKeyword(""); setCategory(""); setLocation(""); setType(""); setStatus(""); setCampus(""); }}
            className="text-xs font-bold text-[#6EE7F7] uppercase tracking-widest active:scale-95 transition-transform"
          >
            clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">
          <Search size={32} className="text-white/25 mb-3" />
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest leading-relaxed">No matching items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 📌 SUB-VIEW 3: POST TAB
// ────────────────────────────────────────────────────────
function PostTab({ userEmail, onSuccess }: { userEmail: string; onSuccess: () => void }) {
  const [type, setType] = useState<"LOST" | "FOUND">("LOST");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [verificationQuestion, setVerificationQuestion] = useState("");
  const [verificationAnswer, setVerificationAnswer] = useState("");
  const [contactPreference, setContactPreference] = useState("In-app chat only");
  const [campus, setCampus] = useState("KTR");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Up to 3 photo upload
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const remainingSlots = 3 - imageFiles.length;
      const filesToAdd = filesArray.slice(0, remainingSlots);

      setImageFiles(prev => [...prev, ...filesToAdd]);
      
      const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("Please add a title."); return; }
    if (!category) { setErrorMsg("Please select a category."); return; }
    if (!location) { setErrorMsg("Please select a location."); return; }
    if (type === "LOST" && !verificationQuestion.trim()) { setErrorMsg("Please add a verification question."); return; }
    if (type === "LOST" && !verificationAnswer.trim()) { setErrorMsg("Please add the correct verification answer."); return; }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Upload photos to Supabase Storage in parallel if any
      const photoUrlsList: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("item_images")
          .upload(fileName, file, { contentType: file.type });
        
        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("item_images").getPublicUrl(fileName);
          photoUrlsList.push(publicData.publicUrl);
        }
      }

      // If storage upload failed completely but images were selected, load default placeholder
      if (imageFiles.length > 0 && photoUrlsList.length === 0) {
        photoUrlsList.push("https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=600");
      }

      // 2. Insert post document
      const { error } = await supabase.from("items").insert([{
        type,
        title: title.trim(),
        description: description.trim(),
        category,
        location,
        date_time: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
        contact_preference: contactPreference,
        verification_question: type === "LOST" ? verificationQuestion.trim() : null,
        verification_answer: type === "LOST" ? verificationAnswer.trim().toLowerCase() : null, // Normalize case
        photo_url: JSON.stringify(photoUrlsList),
        campus,
        user_email: userEmail,
        status: "Active"
      }]);

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-2">
        {/* Type Toggle */}
        <div className="flex p-1.5 bg-transparent border border-white/10 rounded-full w-full max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setType("LOST")}
            className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
              type === "LOST" 
                ? "bg-[#6EE7F7] text-slate-950 shadow-[0_0_15px_rgba(110,231,247,0.4)]" 
                : "text-white/60 hover:text-white"
            }`}
          >
            Lost Item
          </button>
          <button
            type="button"
            onClick={() => setType("FOUND")}
            className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
              type === "FOUND" 
                ? "bg-[#6EE7F7] text-slate-950 shadow-[0_0_15px_rgba(110,231,247,0.4)]" 
                : "text-white/60 hover:text-white"
            }`}
          >
            Found Item
          </button>
        </div>
      </div>

      <h2 className="text-3xl font-bold tracking-tight text-white font-title-md">Report Item</h2>
      
      {/* Info note */}
      {type === "FOUND" && (
        <div className="p-4 rounded-2xl bg-[#2ECC71]/10 border border-[#2ECC71]/20 text-xs text-[#2ECC71] leading-relaxed">
          💡 <strong>I found this item and want to return it to the owner.</strong> Please provide details of the item. Only the rightful owner will challenge the claim.
        </div>
      )}

      {/* Campus */}
      <GlassSelect 
        label="Campus *"
        value={campus}
        onChange={(e: any) => setCampus(e.target.value)}
        options={CAMPUSES.map(c => `${c} Campus`)}
      />

      {/* Title */}
      <GlassInput 
        label="Item Name"
        value={title}
        onChange={(e: any) => setTitle(e.target.value)}
        placeholder="e.g., Silver MacBook Pro"
      />

      {/* Description */}
      <GlassTextArea 
        label="Detailed Description"
        value={description}
        onChange={(e: any) => setDescription(e.target.value)}
        placeholder="Add details like condition, serial number, etc."
        rows={3}
      />

      {/* Location & Date side-by-side */}
      <div className="grid grid-cols-2 gap-4">
        <GlassSelect 
          label="Location"
          value={location}
          onChange={(e: any) => setLocation(e.target.value)}
          options={LOCATIONS}
          placeholder="Select location..."
        />
        <GlassDateTime 
          label="Date"
          value={dateTime}
          onChange={(e: any) => setDateTime(e.target.value)}
        />
      </div>

      {/* Category */}
      <GlassSelect 
        label="Category"
        value={category}
        onChange={(e: any) => setCategory(e.target.value)}
        options={CATEGORIES}
        placeholder="Select category..."
      />

      {/* Photos */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Add Photos</label>
        <div className="flex gap-4 items-center flex-wrap">
          {imagePreviews.map((preview, i) => (
            <div key={i} className="w-28 h-28 rounded-2xl relative overflow-hidden bg-white/[0.03] border border-white/[0.08] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeImage(i)}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 border border-white/10 text-white/80 hover:bg-black transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {imageFiles.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-2xl border border-white/10 hover:border-[#6EE7F7]/50 flex flex-col items-center justify-center text-white/30 hover:text-white/60 active:scale-95 transition-all bg-white/[0.02] hover:bg-white/[0.04] gap-1"
            >
              <Camera size={24} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400/90 mt-1">Add Photo</span>
            </button>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          multiple 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Verification Question & Answer (For Lost Posts only) */}
      {type === "LOST" && (
        <div className="flex flex-col gap-5 p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 shadow-2xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6EE7F7]">Security Verification Check</span>
          <GlassInput 
            label="Verification Challenge Question *"
            value={verificationQuestion}
            onChange={(e: any) => setVerificationQuestion(e.target.value)}
            placeholder="e.g. What color is the keychain?"
          />
          <GlassInput 
            label="Expected Answer *"
            value={verificationAnswer}
            onChange={(e: any) => setVerificationAnswer(e.target.value)}
            placeholder="e.g. Red, Spiderman"
          />
        </div>
      )}

      {/* Contact preference */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Preference</label>
        <div className="flex items-center gap-6">
          {["In-app chat only", "Show my phone number"].map(opt => (
            <label key={opt} className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-white/70 hover:text-white transition-colors">
              <input 
                type="radio" 
                name="contactPref" 
                checked={contactPreference === opt} 
                onChange={() => setContactPreference(opt)}
                className="accent-[#6EE7F7] w-4.5 h-4.5"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Error display */}
      {errorMsg && <p className="text-xs font-bold text-red-500 mt-1">{errorMsg}</p>}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4.5 rounded-full text-base font-semibold tracking-wide transition-all bg-[#6EE7F7] text-slate-950 disabled:opacity-50 hover:bg-[#5cd6e6] active:scale-95 shadow-[0_0_20px_rgba(110,231,247,0.4)] mt-4"
      >
        {submitting ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-slate-950" size={18} />
            <span>Submitting...</span>
          </div>
        ) : "Submit Report"}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────
// 📌 SUB-VIEW 4: MY POSTS TAB
// ────────────────────────────────────────────────────────
function MyPostsTab({ 
  items, userEmail, onSelect, onOpenChat, onRefresh, ssoToken 
}: { 
  items: LostFoundItem[]; 
  userEmail: string; 
  onSelect: (i: LostFoundItem) => void;
  onOpenChat: (t: ChatThread) => void;
  onRefresh: () => void;
  ssoToken: string;
}) {
  const [subTab, setSubTab] = useState<"LOST" | "FOUND" | "RESOLVED" | "CHATS">("LOST");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [claimsCount, setClaimsCount] = useState<Record<string, number>>({});
  const [threadsLoading, setThreadsLoading] = useState(false);

  // Fetch threads & claim count on tab activation
  useEffect(() => {
    if (subTab === "CHATS") {
      setThreadsLoading(true);
      fetch(`${NEST_URL}/api/messages/my/threads`, {
        headers: { 
          "Authorization": `Bearer ${ssoToken || "dummy"}`, 
          "bypass-tunnel-reminder": "true" 
        }
      })
        .then(r => r.json())
        .then(res => {
          if (res.success) setThreads(res.data || []);
        })
        .catch(err => console.error(err))
        .finally(() => setThreadsLoading(false));
    }
  }, [subTab, ssoToken]);

  // Load claims count for items to show "Claim Count"
  useEffect(() => {
    const fetchClaimsCounts = async () => {
      try {
        const { data, error } = await supabase.from("claims").select("item_id");
        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach(claim => {
            counts[claim.item_id] = (counts[claim.item_id] || 0) + 1;
          });
          setClaimsCount(counts);
        }
      } catch (e) {}
    };
    fetchClaimsCounts();
  }, [items]);

  const myLost = items.filter(i => i.user_email === userEmail && i.type === "LOST" && i.status !== "Resolved");
  const myFound = items.filter(i => i.user_email === userEmail && i.type === "FOUND" && i.status !== "Resolved");
  const myResolved = items.filter(i => i.user_email === userEmail && i.status === "Resolved");

  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (e: any) {
      alert("Failed to delete: " + e.message);
    }
  };

  const markResolvedDirectly = async (item: LostFoundItem) => {
    if (!confirm("Mark this item as resolved?")) return;
    try {
      const { error } = await supabase
        .from("items")
        .update({ status: "Resolved", resolved_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
      onRefresh();
    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sub Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: "LOST", label: "My Lost" },
          { id: "FOUND", label: "My Found" },
          { id: "RESOLVED", label: "Resolved" },
          { id: "CHATS", label: "Chats" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              subTab === t.id ? "bg-[#6EE7F7] text-slate-950 shadow-md shadow-[#6EE7F7]/15" : "text-white/40 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Render Sub Tabs content */}
      {subTab === "LOST" && (
        <div className="flex flex-col gap-4">
          {myLost.length === 0 ? (
            <p className="text-center py-24 text-xs font-bold text-white/20 uppercase tracking-widest bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">No active lost reports</p>
          ) : (
            myLost.map(item => (
              <div key={item.id} className="p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 flex flex-col gap-4 shadow-xl shadow-black/10">
                <div className="flex justify-between items-start gap-4">
                  <div onClick={() => onSelect(item)} className="cursor-pointer overflow-hidden flex-1">
                    <h3 className="text-base font-bold text-white leading-snug truncate">{item.title}</h3>
                    <span className="text-xs text-white/40 block mt-1">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#6EE7F7]/15 text-[#6EE7F7] border border-[#6EE7F7]/25 shrink-0">
                    Claims: {claimsCount[item.id] || 0}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-white/5 mt-1">
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="p-3.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-transform hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => markResolvedDirectly(item)}
                    className="h-12 px-5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform hover:bg-emerald-500/25"
                  >
                    Mark Resolved ✅
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FOUND */}
      {subTab === "FOUND" && (
        <div className="flex flex-col gap-4">
          {myFound.length === 0 ? (
            <p className="text-center py-24 text-xs font-bold text-white/20 uppercase tracking-widest bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">No active found reports</p>
          ) : (
            myFound.map(item => (
              <div key={item.id} className="p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 flex justify-between items-center gap-4 shadow-xl">
                <div onClick={() => onSelect(item)} className="cursor-pointer overflow-hidden flex-1">
                  <h3 className="text-base font-bold text-white leading-snug truncate">{item.title}</h3>
                  <span className="text-xs text-white/40 block mt-1">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="p-3.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-transform hover:bg-red-500/20 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* RESOLVED */}
      {subTab === "RESOLVED" && (
        <div className="flex flex-col gap-4">
          {myResolved.length === 0 ? (
            <p className="text-center py-24 text-xs font-bold text-white/20 uppercase tracking-widest bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">No resolved reports history</p>
          ) : (
            myResolved.map(item => (
              <div key={item.id} onClick={() => onSelect(item)} className="p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 flex justify-between items-center gap-4 cursor-pointer hover:bg-[#0f131f]/60 hover:border-[#6EE7F7]/20 transition-all shadow-xl">
                <div className="overflow-hidden flex-1">
                  <h3 className="text-base font-bold text-white/70 leading-snug truncate">{item.title}</h3>
                  <span className="text-xs text-white/40 block mt-1">Resolved on {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/[0.08] shrink-0">
                  Resolved
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* CHATS */}
      {subTab === "CHATS" && (
        <div className="flex flex-col gap-4">
          {threadsLoading ? (
            <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-[#6EE7F7]" /></div>
          ) : threads.length === 0 ? (
            <p className="text-center py-24 text-xs font-bold text-white/20 uppercase tracking-widest bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8">No active chat threads</p>
          ) : (
            threads.map(thread => (
              <div 
                key={thread.id} 
                onClick={() => onOpenChat(thread)}
                className="p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 hover:border-[#6EE7F7]/30 hover:bg-[#0f131f]/60 active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center gap-4 shadow-xl"
              >
                <div className="flex flex-col overflow-hidden max-w-[80%]">
                  <span className="text-[15px] font-bold text-white leading-snug truncate">{thread.items?.title}</span>
                  <span className="text-xs text-[#6EE7F7] font-semibold mt-1">Chatting with: {thread.users?.name}</span>
                </div>
                <MessageSquare size={18} className="text-white/40 shrink-0" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 📌 SUB-VIEW 5: PROFILE TAB (STATS)
// ────────────────────────────────────────────────────────
function ProfileTab({ 
  items, userEmail, userName, userDept 
}: { 
  items: LostFoundItem[]; 
  userEmail: string;
  userName: string;
  userDept: string;
}) {
  const myLostCount = items.filter(i => i.user_email === userEmail && i.type === "LOST").length;
  const myFoundCount = items.filter(i => i.user_email === userEmail && i.type === "FOUND").length;
  const returnedCount = items.filter(i => i.user_email === userEmail && i.type === "FOUND" && i.status === "Resolved").length;

  const isHelper = returnedCount >= 3;

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Student Details Card */}
      <div className="w-full p-6 rounded-3xl bg-[#0f131f]/40 border border-white/5 flex items-center gap-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(110,231,247,0.08) 0%, transparent 70%)', filter: 'blur(10px)' }} />
        <div className="w-16 h-16 rounded-full bg-[#6EE7F7]/10 border border-[#6EE7F7]/20 flex items-center justify-center text-2xl shrink-0 font-black text-[#6EE7F7]">
          {userName[0]}
        </div>
        <div className="overflow-hidden">
          <h3 className="text-lg font-bold text-white leading-tight truncate">{userName}</h3>
          <p className="text-sm text-white/50 truncate mt-0.5">{userDept || "SRM Student"}</p>
          <p className="text-xs text-white/30 mt-1.5 truncate">{userEmail}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="p-5 rounded-2xl bg-[#0f131f]/40 border border-white/5 flex flex-col items-center text-center shadow-lg">
          <span className="text-2xl font-bold text-white">{myLostCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1 leading-tight">Items Lost</span>
        </div>
        <div className="p-5 rounded-2xl bg-[#0f131f]/40 border border-white/5 flex flex-col items-center text-center shadow-lg">
          <span className="text-2xl font-bold text-white">{myFoundCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1 leading-tight">Items Found</span>
        </div>
        <div className="p-5 rounded-2xl bg-[#0f131f]/40 border border-white/5 flex flex-col items-center text-center shadow-lg">
          <span className="text-2xl font-bold text-white">{returnedCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1 leading-tight">Returned</span>
        </div>
      </div>

      {/* Helper Badge Section */}
      {isHelper ? (
        <div className="p-6 rounded-3xl bg-yellow-500/[0.03] border border-yellow-500/20 flex items-center gap-6 relative overflow-hidden shadow-xl shadow-yellow-500/5">
          <div className="w-12 h-12 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Samaritan Badge Active</h4>
            <p className="text-xs text-white/50 leading-relaxed mt-1">You have successfully returned 3+ found items to their owners. Thank you for making SRM a better place! 🌟</p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-6 opacity-50">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 filter grayscale">
            🏆
          </div>
          <div>
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest">Samaritan Badge locked</h4>
            <p className="text-[11px] text-white/30 leading-snug mt-1">Successfully return 3 found items to unlock the Samaritan helper badge on your profile. ({returnedCount}/3 completed)</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 📌 MODAL / OVERLAY: ITEM DETAIL
// ────────────────────────────────────────────────────────
function ItemDetailOverlay({ 
  item, userEmail, onClose, onOpenChat, onRefresh, ssoToken
}: { 
  item: LostFoundItem; 
  userEmail: string; 
  onClose: () => void; 
  onOpenChat: (t: ChatThread) => void;
  onRefresh: () => void;
  ssoToken: string;
}) {
  const isOwner = item.user_email === userEmail;

  // Verification flow state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [shakeInput, setShakeInput] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimLocation, setClaimLocation] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Parse photos
  let photosList: string[] = [];
  if (item.photo_url) {
    try {
      const parsed = JSON.parse(item.photo_url);
      photosList = Array.isArray(parsed) ? parsed : [item.photo_url];
    } catch {
      photosList = [item.photo_url];
    }
  }

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const handleMineClaim = async () => {
    if (!claimAnswer.trim()) return;
    setClaimError("");

    // Normalise comparison
    const correctAns = (item.verification_answer || "").trim().toLowerCase();
    const providedAns = claimAnswer.trim().toLowerCase();

    if (providedAns !== correctAns) {
      setShakeInput(true);
      setClaimError("Answer does not match!");
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    setClaimSubmitting(true);

    try {
      // 1. Submit claim to Express API instead of direct Supabase insert
      // This triggers push notifications and automatically inserts the first message in the chat.
      const response = await fetch(`${NEST_URL}/api/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ssoToken || "dummy"}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({
          item_id: item.id,
          answer: claimAnswer.trim()
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.message || "Failed to submit claim.");

      const newClaim = res.data;

      // 2. Since the answer matched, we accept the claim and mark item as Claimed
      await supabase.from("items").update({ status: "Claimed" }).eq("id", item.id);
      await supabase.from("claims").update({ status: "Accepted" }).eq("id", newClaim.id);

      // 3. Create active thread notification redirect
      const thread: ChatThread = {
        id: newClaim.id,
        item_id: item.id,
        claimer_email: userEmail,
        status: "Accepted",
        created_at: newClaim.created_at,
        items: {
          title: item.title,
          type: item.type,
          location: item.location,
          user_email: item.user_email || ""
        },
        users: {
          name: "Owner"
        }
      };

      onOpenChat(thread);
    } catch (e: any) {
      setClaimError(e.message || "Failed to claim item.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleFoundClaim = async () => {
    if (!claimLocation.trim()) { setClaimError("Please describe where you found it."); return; }
    setClaimSubmitting(true);
    setClaimError("");

    try {
      // Submit claim to Express API instead of direct Supabase insert
      // This triggers push notifications and automatically inserts the first message in the chat thread.
      const response = await fetch(`${NEST_URL}/api/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ssoToken || "dummy"}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({
          item_id: item.id,
          answer: `Found details: ${claimLocation.trim()} • Msg: ${claimMessage.trim()}`
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.message || "Failed to submit.");

      const newClaim = res.data;
      const thread: ChatThread = {
        id: newClaim.id,
        item_id: item.id,
        claimer_email: userEmail,
        status: "Pending",
        created_at: newClaim.created_at,
        items: {
          title: item.title,
          type: item.type,
          location: item.location,
          user_email: item.user_email || ""
        },
        users: {
          name: "Finder"
        }
      };

      onOpenChat(thread);
    } catch (e: any) {
      setClaimError(e.message || "Failed to submit.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] overflow-hidden flex flex-col"
        style={{ background: "#0a0d17", border: "1.5px solid rgba(110,231,247,0.15)", maxHeight: "90vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-3 flex justify-between items-center border-b border-white/5">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">{item.type} Report</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col gap-5"
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        >
          {/* Images Swipe */}
          {photosList.length > 0 && photosList[0].startsWith("http") ? (
            <div className="w-full aspect-video rounded-2xl bg-black overflow-hidden relative border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photosList[activePhotoIdx]} alt={item.title} className="w-full h-full object-cover" />
              {photosList.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photosList.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActivePhotoIdx(i)}
                      className={`w-2 h-2 rounded-full ${activePhotoIdx === i ? "bg-[#6EE7F7]" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-white/[0.02] flex flex-col items-center justify-center border border-dashed border-white/10 text-white/25">
              <Camera size={36} />
              <span className="text-xs font-bold uppercase mt-2.5">No Image Provided</span>
            </div>
          )}

          {/* Details */}
          <div>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-xl font-bold text-white leading-snug">{item.title}</h2>
              <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/10 shrink-0">
                {item.category}
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs text-white/50 mt-2.5">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} style={{ color: "#6EE7F7" }} />
                <span>{item.location} ({item.campus} Campus)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{new Date(item.date_time).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6EE7F7] block mb-1.5">Details / Description</span>
            <p className="text-sm text-[#dfe1f4]/80 leading-relaxed font-body">{item.description || "No description provided."}</p>
          </div>

          {/* User info */}
          <div className="flex justify-between items-center p-5 rounded-3xl bg-[#0f131f]/40 border border-white/5 text-sm shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#6EE7F7]/10 border border-[#6EE7F7]/20 flex items-center justify-center font-bold text-[#6EE7F7]">
                {item.user_email ? item.user_email[0].toUpperCase() : "S"}
              </div>
              <div>
                <p className="font-bold text-white/80">Posted By</p>
                <p className="text-xs opacity-50">{item.user_email || "Anonymous Student"}</p>
              </div>
            </div>
            {item.contact_preference && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/5 text-white/40 border border-white/[0.08]">
                {item.contact_preference}
              </span>
            )}
          </div>

          {/* Actions */}
          {isOwner ? (
            <div className="mt-2 flex gap-3.5">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this report?")) {
                    supabase.from("items").delete().eq("id", item.id).then(({ error }) => {
                      if (!error) {
                        onRefresh();
                        onClose();
                      } else {
                        alert("Delete failed: " + error.message);
                      }
                    });
                  }
                }}
                className="flex-1 h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Post
              </button>
              {item.status !== "Resolved" && (
                <button
                  onClick={() => {
                    if (confirm("Mark this item as resolved?")) {
                      supabase.from("items").update({ status: "Resolved", resolved_at: new Date().toISOString() }).eq("id", item.id).then(({ error }) => {
                        if (!error) {
                          onRefresh();
                          onClose();
                        }
                      });
                    }
                  }}
                  className="flex-1 h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-[#2ECC71] text-white hover:bg-[#27ae60] active:scale-95 shadow-lg"
                >
                  Mark Resolved ✅
                </button>
              )}
            </div>
          ) : item.status === "Active" && (
            <div className="mt-2">
              {item.type === "FOUND" ? (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="w-full h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-[#2ECC71] text-white hover:bg-[#27ae60] active:scale-95 shadow-lg shadow-[#2ECC71]/25"
                >
                  This is Mine 🙋‍♂️
                </button>
              ) : (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="w-full h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-[#2ECC71] text-white hover:bg-[#27ae60] active:scale-95 shadow-lg shadow-[#2ECC71]/25"
                >
                  I Found This Item 🔍
                </button>
              )}
            </div>
          )}

          {/* Render inline verification claim popup */}
          <AnimatePresence>
            {showClaimModal && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 15 }}
                className="p-6 rounded-3xl bg-[#0f131f]/60 backdrop-blur-xl border border-white/10 mt-3 flex flex-col gap-4.5 shadow-2xl"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2ECC71]">Claim Details Verification</span>
                  <button onClick={() => setShowClaimModal(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
                </div>

                {item.type === "FOUND" ? (
                  // Owner claiming a found item -> Answers verification question
                  <div className="flex flex-col gap-4">
                    {item.verification_question ? (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs leading-relaxed">
                        <span className="font-bold text-[#6EE7F7] block mb-1">Verification Challenge:</span>
                        {item.verification_question}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 leading-relaxed">Describe a unique identifier only the owner would know (scratches, lockscreen wallpapers, contents, etc).</p>
                    )}
                    <input 
                      type="text" 
                      value={claimAnswer}
                      onChange={(e) => setClaimAnswer(e.target.value)}
                      placeholder="Type your verification answer..."
                      className={`w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none bg-white/[0.02] border ${
                        shakeInput ? "border-red-500 shake-element" : "border-white/10"
                      }`}
                    />
                    {claimError && <p className="text-xs font-bold text-red-500 mt-1">{claimError}</p>}
                    <button
                      onClick={handleMineClaim}
                      disabled={claimSubmitting}
                      className="h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-[#2ECC71] text-white disabled:opacity-50"
                    >
                      {claimSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Submit & Verify"}
                    </button>
                  </div>
                ) : (
                  // Finder reporting they found a lost item
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1.5 block">Where exactly did you find it? *</label>
                      <input 
                        type="text" 
                        value={claimLocation}
                        onChange={(e) => setClaimLocation(e.target.value)}
                        placeholder="e.g. library second floor, cafeteria desk"
                        className="w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none bg-white/[0.02] border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1.5 block">Short Message to Owner</label>
                      <textarea 
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        placeholder="I have handed it over to admin block / let's meet..."
                        rows={2}
                        className="w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none bg-white/[0.02] border border-white/10 text-white resize-none"
                      />
                    </div>
                    {claimError && <p className="text-xs font-bold text-red-500 mt-1">{claimError}</p>}
                    <button
                      onClick={handleFoundClaim}
                      disabled={claimSubmitting}
                      className="h-13 rounded-2xl text-sm font-semibold tracking-wide transition-all bg-[#2ECC71] text-white disabled:opacity-50"
                    >
                      {claimSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Send Finder Notification"}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ────────────────────────────────────────────────────────
// 📌 MODAL / OVERLAY: 1-to-1 REAL-TIME CHAT
// ────────────────────────────────────────────────────────
function ChatThreadOverlay({ 
  thread, userEmail, onClose, onRefresh, ssoToken 
}: { 
  thread: ChatThread; 
  userEmail: string; 
  onClose: () => void;
  onRefresh: () => void;
  ssoToken: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if user is the poster of the item
  const isPoster = thread.items?.user_email === userEmail;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages thread history
  useEffect(() => {
    setLoading(true);
    fetch(`${NEST_URL}/api/messages/${thread.id}`, {
      headers: { 
        "Authorization": `Bearer ${ssoToken || "dummy"}`, 
        "bypass-tunnel-reminder": "true" 
      }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setMessages(res.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => {
        setLoading(false);
        setTimeout(scrollToBottom, 200);
      });
  }, [thread.id, ssoToken]);

  // Subscribe to real-time updates via Supabase Realtime Channels
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `claim_id=eq.${thread.id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Resolve sender name
          const { data: userDataObj } = await supabase
            .from("users")
            .select("name")
            .eq("email", newMsg.sender_email)
            .maybeSingle();

          const enrichedMsg: Message = {
            ...newMsg,
            users: userDataObj ? { name: userDataObj.name } : undefined
          };

          setMessages(prev => {
            // Prevent duplicate insertion
            if (prev.some(m => m.id === enrichedMsg.id)) return prev;
            return [...prev, enrichedMsg];
          });
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText.trim();
    setInputText("");

    try {
      // Call backend route directly to send message (sends push notification too)
      await fetch(`${NEST_URL}/api/messages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ssoToken || "dummy"}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ claim_id: thread.id, content: txt })
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const markItemAsResolved = async () => {
    if (!confirm("Mark this item as resolved? This will close the chat and archive the post.")) return;
    try {
      // Call backend resolve API
      const response = await fetch(`${NEST_URL}/api/items/${thread.item_id}/resolve`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ssoToken || "dummy"}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ 
          claim_id: thread.id, 
          resolution_type: thread.items?.type === "LOST" ? "handed_over" : "found_it",
          rating: 5, // Default rating
          comment: "Resolved via chat"
        })
      });
      const res = await response.json();
      if (res.success) {
        alert("Report resolved and moved to Activity History!");
        onRefresh();
        onClose();
      } else {
        alert(res.message || "Failed to resolve item.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90"
        onClick={onClose}
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed inset-0 top-12 z-50 rounded-t-[32px] overflow-hidden flex flex-col"
        style={{ background: "#0a0d17", border: "1.5px solid rgba(110,231,247,0.15)" }}
      >
        {/* Chat Header (Floating card from mockup) */}
        <div className="mx-4 mt-4 mb-2 p-4 rounded-3xl bg-[#0f131f]/60 backdrop-blur-xl border border-white/10 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white leading-snug">{thread.items?.title}</span>
              <span className="text-xs text-slate-400 font-medium mt-0.5">
                {thread.items?.type === 'LOST' ? 'Lost' : 'Found'} - In Chat
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <MessageSquare size={18} className="text-[#6EE7F7]" />
            {isPoster && (
              <button 
                onClick={markItemAsResolved}
                className="px-4 py-2 rounded-xl bg-[#2ECC71] text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform"
              >
                Resolve ✅
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">
          {loading ? (
            <div className="my-auto flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-[#6EE7F7]" />
              <span className="text-xs uppercase font-bold tracking-widest opacity-35">Loading Messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="my-auto text-center opacity-30 text-xs py-10 uppercase tracking-widest font-bold">
              Say Hi to start the conversation!
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_email === userEmail;
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <span className="text-xs font-semibold text-slate-400 mb-1 px-1">{msg.users?.name || (isMe ? "Me" : "User")}</span>
                  <div 
                    className={`rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-lg ${
                      isMe 
                        ? "bg-[#6EE7F7] text-slate-950 rounded-tr-none shadow-[0_0_15px_rgba(110,231,247,0.25)] font-medium" 
                        : "bg-[#0f131f]/60 border border-white/10 text-white rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-slate-500 mt-2 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-white/5 bg-[#0a0d17] flex gap-3 items-center"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3.5 text-sm outline-none text-white placeholder:text-white/45 focus:border-[#6EE7F7]/50"
          />
          <button 
            type="submit"
            className="w-12 h-12 rounded-full bg-[#6EE7F7] text-slate-950 flex items-center justify-center hover:bg-[#5cd6e6] active:scale-95 transition-all shrink-0 shadow-[0_0_15px_rgba(110,231,247,0.3)]"
          >
            <Send size={16} />
          </button>
        </form>
      </motion.div>
    </>
  );
}
