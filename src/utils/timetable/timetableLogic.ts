import { ScheduleData } from "@/types";
import { parseTimetableTime } from "../dashboard/timetableLogic";
import { supabase } from "@/lib/supabase";
import { EncryptionUtils } from "@/utils/shared/Encryption";

export const getStudentKey = (): string | null => {
  if (typeof window === "undefined") return null;
  const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
  if (creds?.username) return creds.username.trim();
  const dataStr = localStorage.getItem("classivo_data");
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr);
      return data?.profile?.email || data?.profile?.regNo || data?.registrationNumber || null;
    } catch {}
  }
  return null;
};

export const syncCustomClassesToSupabase = async (updatedCustoms: any) => {
  const studentKey = getStudentKey();
  if (!studentKey) return;
  try {
    await supabase.from("user_custom_classes").upsert(
      {
        student_key: studentKey,
        custom_classes: updatedCustoms,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_key" }
    );
  } catch (err) {
    console.warn("Supabase custom classes sync notice:", err);
  }
};

export const fetchCustomClassesFromSupabase = async (): Promise<any | null> => {
  const studentKey = getStudentKey();
  if (!studentKey) return null;
  try {
    const { data, error } = await supabase
      .from("user_custom_classes")
      .select("custom_classes")
      .eq("student_key", studentKey)
      .single();

    if (!error && data?.custom_classes) {
      localStorage.setItem("classivo_custom_classes", JSON.stringify(data.custom_classes));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("custom_classes_updated"));
      }
      return data.custom_classes;
    }
  } catch (err) {
    console.warn("Fetch custom classes from Supabase notice:", err);
  }
  return null;
};

export const getInitialActiveDay = (
  schedule: ScheduleData,
  isHoliday: boolean,
  dayOrder: number,
  nextWorkingDayOrder: number | null,
) => {
  if (isHoliday) {
    return nextWorkingDayOrder || 1;
  } else if (!isNaN(dayOrder) && dayOrder >= 1 && dayOrder <= 5) {
    const todayData = schedule[`Day ${dayOrder}`] || {};
    let lastEnd = 0;
    Object.keys(todayData).forEach((time) => {
      const endStr = time.split("-")[1];
      if (endStr) {
        const endMins = parseTimetableTime(endStr);
        if (endMins > lastEnd) lastEnd = endMins;
      }
    });

    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

    if (lastEnd > 0 && nowMins >= lastEnd) {
      return nextWorkingDayOrder || (dayOrder < 5 ? dayOrder + 1 : 1);
    } else {
      return dayOrder;
    }
  }
  return 1;
};

export const handleAddClassLogic = (
  newSub: string,
  newRoom: string,
  startTime: string,
  endTime: string,
  newType: "theory" | "lab",
  activeDay: number,
) => {
  if (!newSub.trim() || !newRoom.trim() || !startTime || !endTime) return null;

  const stored = localStorage.getItem("classivo_custom_classes");
  const currentCustoms: Record<number, any[]> = stored
    ? JSON.parse(stored)
    : {};

  const newClassItem = {
    id: `custom-${Date.now()}`,
    code: newSub,
    courseTitle: newSub,
    course: newSub,
    time: `${startTime} - ${endTime}`,
    room: newRoom,
    faculty: "Faculty Rescheduled",
    slot: newType === "lab" ? "P1" : "A1",
    type: newType,
    isCustom: true,
  };

  const updated = {
    ...currentCustoms,
    [activeDay]: [...(currentCustoms[activeDay] || []), newClassItem],
  };

  localStorage.setItem("classivo_custom_classes", JSON.stringify(updated));
  window.dispatchEvent(new Event("custom_classes_updated"));

  // Sync to Supabase in background
  syncCustomClassesToSupabase(updated);

  return true;
};

export const handleEditClassLogic = (
  activeDay: number,
  oldTimeStr: string,
  newSub: string,
  newRoom: string,
  startTime: string,
  endTime: string,
  newType: "theory" | "lab"
) => {
  if (!newSub.trim() || !newRoom.trim() || !startTime || !endTime) return false;

  const stored = localStorage.getItem("classivo_custom_classes");
  const currentCustoms: Record<number, any[]> = stored ? JSON.parse(stored) : {};

  const dayList = currentCustoms[activeDay] || [];
  const newTimeStr = `${startTime} - ${endTime}`;
  const existingIdx = dayList.findIndex(
    (c: any) => c.time === oldTimeStr || c.originalTime === oldTimeStr || c.time === newTimeStr
  );

  const updatedItem = {
    id: existingIdx >= 0 ? dayList[existingIdx].id : `custom-${Date.now()}`,
    code: newSub,
    courseTitle: newSub,
    course: newSub,
    time: newTimeStr,
    originalTime: oldTimeStr || newTimeStr,
    room: newRoom,
    faculty: existingIdx >= 0 && dayList[existingIdx].faculty && dayList[existingIdx].faculty !== "Faculty Rescheduled"
      ? dayList[existingIdx].faculty
      : "Rescheduled",
    slot: newType === "lab" ? "P1" : "A1",
    type: newType,
    isCustom: true,
    isDeleted: false,
  };

  let newDayList: any[];
  if (existingIdx >= 0) {
    newDayList = [...dayList];
    newDayList[existingIdx] = updatedItem;
  } else {
    newDayList = [...dayList, updatedItem];
  }

  const updated = {
    ...currentCustoms,
    [activeDay]: newDayList,
  };

  localStorage.setItem("classivo_custom_classes", JSON.stringify(updated));
  window.dispatchEvent(new Event("custom_classes_updated"));

  // Sync to Supabase in background
  syncCustomClassesToSupabase(updated);

  return true;
};

export const handleDeleteCustomLogic = (day: number, timeStr: string) => {
  const stored = localStorage.getItem("classivo_custom_classes");
  const currentCustoms: Record<number, any[]> = stored ? JSON.parse(stored) : {};

  const dayList = currentCustoms[day] || [];
  // Mark slot as deleted so mergeSchedule removes it from initialSchedule as well
  const filtered = dayList.filter((c: any) => c.time !== timeStr && c.originalTime !== timeStr);
  filtered.push({
    id: `del-${Date.now()}`,
    time: timeStr,
    originalTime: timeStr,
    isDeleted: true,
    isCustom: true,
  });

  const updated = {
    ...currentCustoms,
    [day]: filtered,
  };

  localStorage.setItem("classivo_custom_classes", JSON.stringify(updated));
  window.dispatchEvent(new Event("custom_classes_updated"));

  // Sync to Supabase in background
  syncCustomClassesToSupabase(updated);

  return true;
};
