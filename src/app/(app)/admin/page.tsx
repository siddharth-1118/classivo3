"use client";
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Send, Bell, Shield, Users, RefreshCw, ArrowUp } from "lucide-react";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";
import { APP_VERSION } from "@/utils/shared/version";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_KEY || "srmnest-admin-2024";
const DEFAULT_APK_URL = process.env.NEXT_PUBLIC_APK_URL || "https://srm-nest-bridge.loca.lt/download/app-debug.apk";

export default function AdminPage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState(DEFAULT_APK_URL);
  const [minVersion, setMinVersion] = useState("1.0.1");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setStatus(null);
      fetchUserCount();
    } else {
      setStatus("Error: Invalid Admin Key");
    }
  };

  const fetchUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (error) {
        setStatus("DB Error: " + error.message);
      } else {
        setUserCount(count);
      }
    } catch (e: any) {
      setStatus("Network Error: Check ngrok and Internet");
    }
  };

  const sendNotification = async () => {
    if (!title || !message) return;
    if (isForceUpdate && !minVersion.trim()) {
      setStatus("Error: Please enter the minimum required version.");
      return;
    }
    setSending(true);
    setStatus("Sending...");

    try {
      const response = await fetchWithLoadBalancer("/api/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title,
          message,
          type: isForceUpdate ? "force_update" : "broadcast",
          url: isForceUpdate ? updateUrl : null,
          min_version: isForceUpdate ? minVersion.trim() : null,
          adminKey
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to broadcast notification");
      }

      setStatus(
        isForceUpdate
          ? `✓ Force update sent! Users below v${minVersion} will be blocked.`
          : `✓ Notification broadcasted to all ${userCount ?? "?"} students.`
      );
      if (!isForceUpdate) {
        setTitle("");
        setMessage("");
      }
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // ─── Login Screen ────────────────────────────────────────────────────────────
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
        <div className="w-full max-w-sm glass-card rounded-[40px] p-8 space-y-8">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 mb-2">
              <Shield className="text-purple-400" size={32} />
            </div>
            <h2 className="text-2xl font-black lowercase tracking-tighter text-white">Security Check</h2>
            <p className="text-xs text-theme-muted uppercase tracking-widest font-bold">Authorized Access Only</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted ml-2">Admin Security Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-theme-bg/50 border border-theme-border rounded-2xl p-4 focus:border-purple-500 outline-none transition-all text-center tracking-widest"
              />
            </div>
            <button
              type="submit"
              className="w-full h-14 bg-purple-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
            >
              Enter Admin Portal
            </button>
            {status && (
              <p className="text-center text-xs font-bold text-red-400 animate-pulse">{status}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ─── Admin Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="p-5 min-h-screen bg-theme-bg pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
          <Shield className="text-purple-400" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black lowercase tracking-tighter text-white">Admin Panel</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/60">Classivo</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass-card rounded-2xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-purple-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Students</span>
          </div>
          <p className="text-2xl font-black text-white">{userCount !== null ? userCount : "—"}</p>
          <button onClick={fetchUserCount} className="text-[9px] text-purple-400/60 font-bold mt-1 flex items-center gap-1 hover:text-purple-400 transition-colors">
            <RefreshCw size={9} /> Refresh
          </button>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUp size={14} className="text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Current Build</span>
          </div>
          <p className="text-2xl font-black text-white">v{APP_VERSION}</p>
          <p className="text-[9px] text-blue-400/60 font-bold mt-1">App version</p>
        </div>
      </div>

      {/* Broadcast card */}
      <div className="glass-card rounded-3xl p-5 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-theme-accent">
            <Bell size={18} />
            <span className="font-bold text-sm">Broadcast Center</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isForceUpdate ? "text-red-400" : "text-theme-muted group-hover:text-red-400"}`}>
              Force Update
            </span>
            <div
              onClick={() => setIsForceUpdate(!isForceUpdate)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${isForceUpdate ? "bg-red-500" : "bg-theme-border"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isForceUpdate ? "left-5" : "left-0.5"}`} />
            </div>
          </label>
        </div>

        {/* Force update config */}
        {isForceUpdate && (
          <div className="rounded-2xl bg-red-500/8 border border-red-500/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Emergency Update Mode</p>
            </div>
            <p className="text-xs text-theme-muted leading-relaxed">
              Users whose app version is <strong className="text-red-400">below the minimum</strong> will be fully locked out until they update.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-theme-muted block mb-1">Min Version Required</label>
                <input
                  type="text"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="e.g. 1.1.0"
                  className="w-full bg-theme-bg/50 border border-red-500/30 rounded-xl p-2.5 text-sm focus:border-red-500 outline-none transition-all font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-theme-muted block mb-1">Your Build</label>
                <div className="w-full bg-theme-bg/30 border border-theme-border/30 rounded-xl p-2.5 text-sm font-mono font-bold text-theme-muted">
                  v{APP_VERSION}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-theme-muted block mb-1">Download URL (APK link)</label>
              <input
                type="text"
                value={updateUrl}
                onChange={(e) => setUpdateUrl(e.target.value)}
                placeholder="Direct APK download link"
                className="w-full bg-theme-bg/50 border border-red-500/30 rounded-xl p-2.5 text-sm focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-theme-muted ml-0.5 block mb-1.5">
            {isForceUpdate ? "Notification Title" : "Title"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isForceUpdate ? "New version available!" : "E.g. Holiday Alert!"}
            className="w-full bg-theme-bg/50 border border-theme-border rounded-2xl p-4 focus:border-theme-accent outline-none transition-all"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-theme-muted ml-0.5 block mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isForceUpdate
                ? "We've added new features and important security fixes. Please update to continue."
                : "Type your message here..."
            }
            rows={3}
            className="w-full bg-theme-bg/50 border border-theme-border rounded-2xl p-4 focus:border-theme-accent outline-none transition-all resize-none"
          />
        </div>

        {/* Send button */}
        <button
          onClick={sendNotification}
          disabled={sending || !title || !message}
          className={`w-full h-14 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 ${
            isForceUpdate
              ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              : "bg-theme-accent text-theme-bg"
          }`}
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
          ) : (
            <Send size={18} />
          )}
          <span>
            {sending
              ? "Broadcasting..."
              : isForceUpdate
              ? `Force Update (block v< ${minVersion})`
              : `Notify All ${userCount ?? ""} Students`}
          </span>
        </button>

        {/* Status */}
        {status && (
          <div
            className={`p-4 rounded-xl text-center text-sm font-medium ${
              status.startsWith("Error") || status.startsWith("DB")
                ? "bg-red-500/10 text-red-400"
                : status === "Sending..."
                ? "bg-blue-500/10 text-blue-400"
                : "bg-green-500/10 text-green-400"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
