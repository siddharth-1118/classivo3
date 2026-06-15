"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { useRouter } from "next/navigation";
import { AcademiaData } from "@/types";
import { compareData, DataDiff } from "@/utils/shared/diffUtils";
import { sendNotification } from "@/utils/shared/notifs";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";
import { isOutdated } from "@/utils/shared/version";
import { UpdateHistoryItem } from "@/types";
import { supabase } from "@/lib/supabase";

import { getScheduleStatus } from "@/utils/academia/academiaLogic";
import calendarDataJson from "@/data/calendar_data.json";


// Removed local supabase init, using shared client from @/lib/supabase

interface AppContextType {
  userData: AcademiaData | null;
  setUserData: (data: AcademiaData | null) => void;
  customDisplayName: string;
  setCustomDisplayName: (name: string) => void;
  isUpdating: boolean;
  setIsUpdating: (val: boolean) => void;
  isOffline: boolean;
  isBackendError: boolean;
  setIsBackendError: (val: boolean) => void;
  backendErrorMsg: string | null;
  setBackendErrorMsg: (msg: string | null) => void;
  refreshData: (creds: any, existingData: any) => Promise<any>;
  performLogin: (creds: any) => Promise<any>;
  loginPromise: Promise<any> | null;
  setLoginPromise: (promise: Promise<any> | null) => void;
  logout: () => Promise<void>;
  latestDiff: DataDiff | null;
  setLatestDiff: (diff: DataDiff | null) => void;
  updateHistory: UpdateHistoryItem[];
  setUpdateHistory: (history: UpdateHistoryItem[]) => void;
  isUpdateHistoryOpen: boolean;
  setIsUpdateHistoryOpen: (open: boolean) => void;
  isInitialized: boolean;
  deferredPrompt: any;
  canInstall: boolean;
  setCanInstall: (val: boolean) => void;
  setDeferredPrompt: (val: any) => void;
  showWelcome: boolean;
  setShowWelcome: (val: boolean) => void;
  profileSeed: string;
  setProfileSeed: (seed: string) => void;
  calendarData: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("classivo_data");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Failed to parse cached data", e);
          return null;
        }
      }
    }
    return null;
  });
  const [customDisplayName, setCustomDisplayName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("classivo_custom_name") || "";
    }
    return "";
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isBackendError, setIsBackendError] = useState(false);
  const [backendErrorMsg, setBackendErrorMsg] = useState<string | null>(null);
  const [latestDiff, setLatestDiff] = useState<DataDiff | null>(null);
  const [updateHistory, setUpdateHistory] = useState<UpdateHistoryItem[]>([]);
  const [isUpdateHistoryOpen, setIsUpdateHistoryOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginPromise, setLoginPromise] = useState<Promise<any> | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [profileSeed, setProfileSeed] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("classivo_profile_seed") || "";
    }
    return "";
  });
  const updateInProgress = React.useRef(false);
  const sessionNotificationsSent = React.useRef<Set<string>>(new Set());
  const classNotificationsSent = React.useRef<Set<string>>(new Set());
  const hasRefreshed = React.useRef(false);
  const hasPrecached = React.useRef(false);
  const router = useRouter();

  const cleanupHistory = (history: UpdateHistoryItem[]) => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(0, 0, 0, 0);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    
    return history.filter(item => item.timestamp >= twoDaysAgo.getTime());
  };

  // Realtime listener for Admin Notifications
  useEffect(() => {
    // Initial check for any active force updates
    const checkForceUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('type', 'force_update')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const update = data[0];
          // Only show force-update overlay if this app version is outdated
          const minVer = update.min_version || "";
          const shouldBlock = minVer ? isOutdated(minVer) : true; // legacy: no min_version = always block

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (new Date(update.created_at) > sevenDaysAgo && shouldBlock) {
            window.dispatchEvent(new CustomEvent("force_update_triggered", {
              detail: { title: update.title, message: update.message, url: update.url, minVersion: minVer }
            }));
          }
        }
      } catch (err) {
        console.error("Error checking force update:", err);
      }
    };

    checkForceUpdate();

    const channel = supabase
      .channel('broadcasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const { title, message, type, url, min_version } = payload.new;

        if (type === "force_update" && url) {
          // Only block if this app version is older than the required min version
          const minVer = min_version || "";
          const shouldBlock = minVer ? isOutdated(minVer) : true;
          if (shouldBlock) {
            window.dispatchEvent(new CustomEvent("force_update_triggered", {
              detail: { title, message, url, minVersion: minVer }
            }));
          }
        } else {
          // Regular broadcast — show in-app toast + push notification
          sendNotification(
            title || "New Message",
            message || "You have a new update from Admin.",
            "admin-broadcast"
          );
          window.dispatchEvent(new CustomEvent("admin_broadcast_received", {
            detail: { title, message }
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem("classivo_update_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const cleaned = cleanupHistory(parsed);
        setUpdateHistory(cleaned);
        localStorage.setItem("classivo_update_history", JSON.stringify(cleaned));
      } catch (e) {
        setUpdateHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!userData?.schedule) return;

    const checkClassNotifications = () => {
      const todayDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const calendar = calendarDataJson as any[];
      const todayEntry = calendar.find((item) => item.date === todayDate);
      
      if (todayEntry && (todayEntry.order === "-" || todayEntry.order === "Holiday" || todayEntry.order === "Sunday")) {
        return;
      }

      const effectiveDayOrder =
        todayEntry && todayEntry.order !== "-"
          ? todayEntry.order
          : userData?.dayOrder || "1";

      const status = getScheduleStatus(userData.schedule, effectiveDayOrder);
      if (!status.nextClass) return;

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const diff = ((status.nextClass as any).startMinutes || 0) - currentMins;
      const nextClassName = (status.nextClass as any).course || "Class";
      const marker15 = `${nextClassName}-15`;
      const marker5 = `${nextClassName}-5`;

      if (diff <= 15 && diff > 5 && !classNotificationsSent.current.has(marker15)) {
        sendNotification(`Next: ${nextClassName}`, `⏳ Starts in ${diff} min`, nextClassName);
        classNotificationsSent.current.add(marker15);
      } else if (diff <= 5 && diff >= 0 && !classNotificationsSent.current.has(marker5)) {
        sendNotification(
          `Next: ${nextClassName}`,
          `📍 ${(status.nextClass as any).room || "No Room"} • ⏳ Starts in ${diff} min`,
          nextClassName
        );
        classNotificationsSent.current.add(marker5);
      }
    };

    checkClassNotifications();
    const interval = setInterval(checkClassNotifications, 60000);
    return () => clearInterval(interval);
  }, [userData]);

  useEffect(() => {
    if (typeof window !== "undefined" && "caches" in window && !hasPrecached.current) {
      hasPrecached.current = true;
      const coreRoutes = ["/", "/attendance", "/marks", "/timetable", "/calendar"];
      coreRoutes.forEach(route => {
        router.prefetch(route);
      });
    }
  }, [router]);

  const calendarData = useMemo(() => {
    return (calendarDataJson as any[]).map(item => ({
      ...item,
      date: new Date(item.date),
      isHoliday: item.dayOrder === "Holiday" || item.dayOrder === "Sunday"
    }));
  }, []);

  const logout = useCallback(async () => {
    await EncryptionUtils.flushAllStorage();
    sessionNotificationsSent.current.clear();
    setUserData(null);
    router.replace("/login");
  }, [router]);

  const performLogin = useCallback(async (creds: any) => {
    setIsBackendError(false);
    setBackendErrorMsg(null);
    const promise = (async () => {
      try {
        const response = await fetchWithLoadBalancer("/login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Student-Key": creds.username,
            "X-Ratio-App": "true"
          },
          body: JSON.stringify(creds),
        });

        if (response.status === 503 || response.status === 429) {
          setIsBackendError(true);
          try {
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              throw new Error("Server returned an invalid response (HTML). Please check backend connectivity.");
            }

            const data = await response.json();
            if (data.detail) setBackendErrorMsg(data.detail);
          } catch {}
          throw new Error("Backend error");
        }

        const text = await response.text();
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
          throw new Error("Server returned HTML instead of data. Please check if your backend is running.");
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Failed to parse server response. The server might be down or misconfigured.");
        }
        if (!response.ok || !data.success) {
          if (typeof data.detail === "object" && data.detail !== null) {
            throw data.detail;
          }
          throw new Error(data.detail || "Login failed");
        }

        // Inject email into profile object
        if (data.profile) {
          data.profile.email = creds.username;
        }

        // Track user in Supabase
        if (data.profile) {
          try {
            await supabase
              .from('users')
              .upsert({
                email: creds.username,
                name: data.profile.name || "Unknown",
                department: data.profile.dept || null,
                year: data.profile.semester || null,
                campus: data.profile.program || null,
                phone_number: data.profile.mobile || null
              }, { onConflict: 'email' });
          } catch (e) {
            console.error("User tracking failed", e);
          }
        }

        if (data.cookies) {
          EncryptionUtils.saveEncrypted("academia_cookies", data.cookies);
          delete data.cookies;
        }

        EncryptionUtils.saveEncrypted("classivo_credentials", {
          username: creds.username,
          password: creds.password,
        });

        EncryptionUtils.setSessionCookie();
        setUserData(data);
        localStorage.setItem("classivo_data", JSON.stringify(data));

        return data;
      } catch (err: any) {
        if (navigator.onLine) {
          setIsBackendError(true);
          setBackendErrorMsg(err.message || "Connection Refused");
        }
        throw err;
      }
    })();

    setLoginPromise(promise);
    return promise;
  }, []);

  const refreshData = useCallback(async (creds: any, existingData: any) => {
    if (updateInProgress.current) return existingData;
    updateInProgress.current = true;
    setIsUpdating(true);
    setIsBackendError(false);
    setBackendErrorMsg(null);
    try {
      const savedCookies = EncryptionUtils.loadDecrypted("academia_cookies");
      const response = await fetchWithLoadBalancer("/refresh", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Student-Key": creds.username,
          "X-Ratio-App": "true"
        },
        body: JSON.stringify({ ...creds, cookies: savedCookies }),
      });

      if (response.status === 503 || response.status === 429) {
        setIsBackendError(true);
        try {
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned an invalid response (HTML). Please check backend connectivity.");
          }

          const data = await response.json();
          if (data.detail) setBackendErrorMsg(data.detail);
        } catch {}
        return existingData;
      }

      const text = await response.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return existingData;
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        return existingData;
      }
      if (!result.success) {
        if (response.status === 401) {
          // Temporarily disabled to prevent accidental logouts
          // await logout();
          console.warn("Unauthorized in refreshData, but skipping logout for now.");
        }
        return existingData;
      }

      EncryptionUtils.setSessionCookie();
      
      let updatedCookies = savedCookies;
      if (result.cookies) {
        EncryptionUtils.saveEncrypted("academia_cookies", result.cookies);
        updatedCookies = result.cookies;
        delete result.cookies;
      }

      const hasOldData = (existingData?.attendance?.length > 0) || (existingData?.marks?.length > 0);
      
      const diff = hasOldData ? compareData(existingData, { ...existingData, ...result }) : null;
      
      let mergedData = {
        ...existingData,
        ...result,
        cookies: updatedCookies,
      };
      
      if (diff) {
        setLatestDiff(diff);
        const timestamp = Date.now();
        const newHistoryItem: UpdateHistoryItem = {
          id: `update-${timestamp}`,
          timestamp,
          diff,
        };
        
        setUpdateHistory(prev => {
          const updated = cleanupHistory([newHistoryItem, ...prev]);
          localStorage.setItem("classivo_update_history", JSON.stringify(updated));
          return updated;
        });

        const changedCourseIds = new Set([
          ...diff.attendanceChanges.map(a => a.course),
          ...diff.newMarks.map(m => m.course)
        ]);

        mergedData.attendance = mergedData.attendance?.map((a: any) => ({
          ...a,
          updatedAt: changedCourseIds.has(a.title || a.course || a.code) ? Date.now() : (a.updatedAt || 0)
        }));

        mergedData.marks = mergedData.marks?.map((m: any) => ({
          ...m,
          updatedAt: changedCourseIds.has(m.courseTitle || m.courseCode) ? Date.now() : (m.updatedAt || 0)
        }));
      }

      // Inject email into profile object
      if (mergedData.profile) {
        mergedData.profile.email = creds.username;
      }

      // Track user in Supabase on refresh
      if (mergedData.profile) {
        try {
          await supabase
            .from('users')
            .upsert({
              email: creds.username,
              name: mergedData.profile.name || "Unknown",
              department: mergedData.profile.dept || null,
              year: mergedData.profile.semester || null,
              campus: mergedData.profile.program || null,
              phone_number: mergedData.profile.mobile || null
            }, { onConflict: 'email' });
        } catch (e) {
          console.error("User tracking failed on refresh", e);
        }
      }

      setUserData(mergedData);
      localStorage.setItem("classivo_data", JSON.stringify(mergedData));
      return mergedData;
    } catch (err) {
      if (navigator.onLine) {
        setIsBackendError(true);
      }
      return existingData;
    } finally {
      setIsUpdating(false);
      updateInProgress.current = false;
    }
  }, [logout]);

  useEffect(() => {
    localStorage.setItem("classivo_onboarded", "true");
    document.cookie = "classivo_onboarded=true; path=/; max-age=31536000; SameSite=Lax";

    if (userData) {
      const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
      if (creds && !hasRefreshed.current) {
        hasRefreshed.current = true;
        setTimeout(() => {
          refreshData(creds, userData);
        }, 2000);
      }
    }

    setIsInitialized(true);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    const installPromptHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", installPromptHandler);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", installPromptHandler);
    };
  }, []);

  useEffect(() => {
    if (userData?.profile?.name && !localStorage.getItem("classivo_profile_seed")) {
      const initialSeed = userData.profile.name;
      setProfileSeed(initialSeed);
      localStorage.setItem("classivo_profile_seed", initialSeed);
    }
  }, [userData]);

  useEffect(() => {
    if (!latestDiff) return;

    latestDiff.attendanceChanges.forEach((change) => {
      const notifId = `att-${change.course}-${change.newMargin}-${change.newPercent}`;
      if (sessionNotificationsSent.current.has(notifId)) return;

      const direction = change.diff > 0 ? "Increased" : "Decreased";
      const icon = change.diff > 0 ? "📈" : "📉";
      const label = change.newPercent >= 75 ? "Margin" : "Required";
      
      sendNotification(
        `Attendance ${direction}`,
        `${icon} ${change.course}: ${label} ${change.oldMargin} -> ${change.newMargin}`,
        `attendance-${change.course}`,
      );
      sessionNotificationsSent.current.add(notifId);
    });

    latestDiff.newMarks.forEach((mark) => {
      const notifId = `mark-${mark.course}-${mark.test}-${mark.score}`;
      if (sessionNotificationsSent.current.has(notifId)) return;

      sendNotification(
        `New Marks: ${mark.course}`,
        `📝 ${mark.test}: ${mark.score}/${mark.max} scored!`,
        `marks-${mark.course}-${mark.test}`,
      );
      sessionNotificationsSent.current.add(notifId);
    });

  }, [latestDiff]);

  const value = useMemo(() => ({
    userData,
    setUserData,
    customDisplayName,
    setCustomDisplayName,
    isUpdating,
    setIsUpdating,
    isOffline,
    isBackendError,
    setIsBackendError,
    backendErrorMsg,
    setBackendErrorMsg,
    refreshData,
    performLogin,
    loginPromise,
    setLoginPromise,
    logout,
    latestDiff,
    setLatestDiff,
    updateHistory,
    setUpdateHistory,
    isUpdateHistoryOpen,
    setIsUpdateHistoryOpen,
    isInitialized,
    deferredPrompt,
    canInstall,
    setCanInstall,
    setDeferredPrompt,
    showWelcome,
    setShowWelcome,
    profileSeed,
    setProfileSeed,
    calendarData,
  }), [userData, customDisplayName, isUpdating, isOffline, isBackendError, backendErrorMsg, refreshData, performLogin, loginPromise, logout, latestDiff, updateHistory, isUpdateHistoryOpen, deferredPrompt, canInstall, showWelcome, profileSeed, calendarData, isInitialized]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
