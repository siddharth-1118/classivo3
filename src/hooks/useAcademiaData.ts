import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { sendNotification } from "@/utils/shared/notifs";
import calendarDataJson from "@/data/calendar_data.json";
import {
  getScheduleStatus,
  calculateOverallAttendance,
  getCriticalAttendance,
} from "@/utils/academia/academiaLogic";
import {
  processAndSortMarks,
  buildCourseMap,
} from "@/utils/marks/marksLogic";
import {
  AcademiaData,
  CalendarEvent,
  ScheduleData,
  ScheduleSlot,
} from "@/types";

const EMPTY_SCHEDULE: ScheduleData = {};

export const useAcademiaData = (data: AcademiaData | null) => {
  const initialSchedule = useMemo(() => data?.schedule || EMPTY_SCHEDULE, [data?.schedule]);
  const [schedule, setSchedule] = useState<ScheduleData>(initialSchedule);
  const [timeStatus, setTimeStatus] = useState<{
    nextClass: ScheduleSlot | null;
    currentClass: ScheduleSlot | null;
  }>({ nextClass: null, currentClass: null });

  const sentMarkers = useRef<Set<string>>(new Set());

  const calendarData = useMemo(() => {
    // If portal academic calendar data is available, use it (merged with static fallback)
    const portalData = (data as any)?.academicCalendar;
    if (Array.isArray(portalData) && portalData.length > 0) {
      // Merge: portal data takes precedence, static data fills gaps
      const portalDates = new Set(portalData.map((e: any) => e.date));
      const staticData = (calendarDataJson || []) as CalendarEvent[];
      const merged = [
        ...portalData,
        ...staticData.filter((e: any) => !portalDates.has(e.date)),
      ];
      return merged as CalendarEvent[];
    }
    return (calendarDataJson || []) as CalendarEvent[];
  }, [(data as any)?.academicCalendar]);

  const courseMap = useMemo(() => buildCourseMap(data), [data]);
  const sortedMarks = useMemo(() => {
    const rawMarks = Array.isArray(data?.marks) ? data.marks : [];
    return processAndSortMarks(rawMarks, courseMap);
  }, [data?.marks, courseMap]);

  const overallMarks = useMemo(() => {
    const validMarks = sortedMarks.filter(m => !m.isNA);
    if (validMarks.length === 0) return 0;
    const totalPct = validMarks.reduce((sum, m) => sum + (m.percentage || 0), 0);
    return Math.round(totalPct / validMarks.length);
  }, [sortedMarks]);

  const recentMarks = useMemo(() => {
    return sortedMarks.filter(m => !m.isNA).slice(0, 2);
  }, [sortedMarks]);
  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const todayEntry = calendarData.find((item) => item.date === todayDate);
  const parsedTodayOrder = parseInt(String(todayEntry?.order ?? "0"), 10);
  const isWorkingDay =
    !!todayEntry &&
    !isNaN(parsedTodayOrder) &&
    parsedTodayOrder >= 1 &&
    parsedTodayOrder <= 5;

  // First future working day from the academic calendar (skips holidays and
  // weekends), so "today's schedule" and "next class" stay calendar-driven
  // even on holidays — e.g. today is a holiday, next working day is Day 5.
  const nextWorkingDayOrder = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = calendarData
      .filter((ev) => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return false;
        d.setHours(0, 0, 0, 0);
        const o = parseInt(String(ev.order ?? ev.dayOrder ?? "0"), 10);
        return d > now && !isNaN(o) && o >= 1 && o <= 5;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = future[0];
    return first
      ? parseInt(String(first.order ?? first.dayOrder), 10)
      : null;
  }, [calendarData]);

  const effectiveDayOrder = isWorkingDay
    ? String(parsedTodayOrder)
    : String(nextWorkingDayOrder || data?.dayOrder || "1");

  const mergeSchedule = useCallback(() => {
    try {
      const stored = localStorage.getItem("classivo_custom_classes");
      const mergedSchedule: ScheduleData = JSON.parse(
        JSON.stringify(initialSchedule),
      );

      if (stored) {
        const customClasses: Record<string, ScheduleSlot[]> =
          JSON.parse(stored);
        Object.keys(customClasses).forEach((dayNum) => {
          const dayKey = `Day ${dayNum}`;
          if (!mergedSchedule[dayKey]) mergedSchedule[dayKey] = {};
          customClasses[dayNum].forEach((cls) => {
            mergedSchedule[dayKey][cls.time] = { ...cls };
          });
        });
      }
      
      setSchedule((current) => {
        const isSame = JSON.stringify(mergedSchedule) === JSON.stringify(current);
        return isSame ? current : mergedSchedule;
      });
    } catch {
    }
  }, [initialSchedule]);

  useEffect(() => {
    mergeSchedule();
    window.addEventListener("custom_classes_updated", mergeSchedule);
    return () =>
      window.removeEventListener("custom_classes_updated", mergeSchedule);
  }, [mergeSchedule]);

  useEffect(() => {
    const updateStatus = () => {
      if (schedule && Object.keys(schedule).length > 0) {
        // On holidays/weekends we're looking at a future day, so the "next
        // class" is its first class — not whatever is coming up on the clock.
        let newStatus = getScheduleStatus(
          schedule,
          effectiveDayOrder,
          isWorkingDay,
        );
        // If nothing is left today (holiday, or today's classes are over),
        // the next class is the first class of the next working day.
        if (!newStatus.nextClass && !newStatus.currentClass && nextWorkingDayOrder) {
          newStatus = getScheduleStatus(schedule, String(nextWorkingDayOrder), false);
        }
        setTimeStatus(current => {
          if (JSON.stringify(newStatus) !== JSON.stringify(current)) {
            return newStatus;
          }
          return current;
        });
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [schedule, effectiveDayOrder, isWorkingDay, nextWorkingDayOrder]);

  const overallAttendance = useMemo(() => {
    return calculateOverallAttendance(data?.attendance || []);
  }, [data?.attendance]);

  const criticalAttendance = useMemo(() => {
    return getCriticalAttendance(data?.attendance || []);
  }, [data?.attendance]);

  const triggerTestClass = useCallback(() => {
    sendNotification(
      "Test Class Incoming",
      "Your test class starts now in Room 101",
      "test-tag",
    );
  }, []);

  return useMemo(() => ({
    timeStatus,
    overallAttendance,
    criticalAttendance,
    overallMarks,
    recentMarks,
    effectiveDayOrder,
    effectiveSchedule: schedule,
    calendarData,
    triggerTestClass,
  }), [timeStatus, overallAttendance, criticalAttendance, overallMarks, recentMarks, effectiveDayOrder, schedule, calendarData, triggerTestClass]);
};
