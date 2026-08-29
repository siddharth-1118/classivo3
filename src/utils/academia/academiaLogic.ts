export const parseTimeValues = (timeStr: string): number => {
  if (!timeStr) return 0;
  // Handles "09:45", "09:45 - 10:40", "09:45 AM - 10:40 AM", "9:45am" etc.
  const m = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = (m[3] || "").toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  else if (mer === "am" && h === 12) h = 0;
  else if (!mer && h < 8) h += 12; // ambiguous 12h-style, assume PM
  return h * 60 + min;
};

export const getScheduleStatus = (
  schedule: any,
  activeDayOrder: string,
  isToday: boolean = true,
) => {
  const targetDay =
    activeDayOrder && activeDayOrder !== "-" ? activeDayOrder : "1";
  const dayKey = `Day ${targetDay}`;
  const todaySchedule = schedule?.[dayKey];

  if (!todaySchedule)
    return { status: "free", nextClass: null, currentClass: null };

  const now = new Date();
  const currentTimeVal = now.getHours() * 60 + now.getMinutes();

  const sortedSlots = Object.entries(todaySchedule)
    .map(([timeRange, details]: [string, any]) => {
      const [startStr, endStr] = timeRange.split(" - ");
      return {
        ...details,
        time: timeRange,
        startMinutes: parseTimeValues(startStr),
        endMinutes: parseTimeValues(endStr),
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // The day is not today (holiday, weekend, or a future day): applying the
  // current clock time to it makes no sense — the next class is simply the
  // first class of that day (e.g. Monday Day 5 starts with 09:45, not the
  // afternoon slots).
  if (!isToday) {
    return {
      status: "free",
      nextClass: sortedSlots[0] || null,
      currentClass: null,
    };
  }

  let currentClass = null;
  let nextClass = null;

  for (const slot of sortedSlots) {
    if (
      currentTimeVal >= slot.startMinutes &&
      currentTimeVal < slot.endMinutes
    ) {
      currentClass = slot;
    } else if (currentTimeVal < slot.startMinutes && !nextClass) {
      nextClass = slot;
    }
  }

  return { status: currentClass ? "busy" : "free", nextClass, currentClass };
};

export const calculateOverallAttendance = (attendance: any[]) => {
  if (!attendance || !Array.isArray(attendance) || attendance.length === 0) return 0;
  const totalConducted = attendance.reduce(
    (acc, curr) => acc + curr.conducted,
    0,
  );
  const totalAbsent = attendance.reduce((acc, curr) => acc + curr.absent, 0);
  const totalPresent = totalConducted - totalAbsent;
  return totalConducted === 0
    ? 0
    : Math.round((totalPresent / totalConducted) * 100);
};

export const getCriticalAttendance = (attendance: any[]) => {
  if (!attendance || !Array.isArray(attendance)) return [];
  return attendance
    .map((subj) => {
      const present = subj.conducted - subj.absent;
      const percent =
        subj.conducted === 0 ? 0 : (present / subj.conducted) * 100;
      const req = Math.ceil(3 * subj.conducted - 4 * present);
      const displayTitle = subj.title || subj.course || "Subject";
      return {
        ...subj,
        percent,
        required: req > 0 ? req : 0,
        displayName: displayTitle,
      };
    })
    .filter((subj) => subj.percent < 75);
};
