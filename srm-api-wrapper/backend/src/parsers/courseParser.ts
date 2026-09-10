import { ParsedAttendance } from './attendanceParser';
import { ParsedSemesterGrades } from './gradeParser';
import { TimetableResult } from './timetableParser';

export interface StudentCourse {
  courseCode: string;
  courseName: string;
  credits: number | null;
  courseType: string | null;
  semester: string | null;
  faculty: string | null;
  section: string | null;
  slot: string | null;
  location: string | null;
}

export function extractStudentCourses(
  attendance?: ParsedAttendance | null,
  grades?: ParsedSemesterGrades | null,
  timetable?: TimetableResult | null
): StudentCourse[] {
  const mapByCode = new Map<string, StudentCourse>();

  // 1. From Attendance
  if (attendance && attendance.subjects) {
    for (const sub of attendance.subjects) {
      const code = (sub.courseCode || '').trim();
      const name = (sub.courseName || '').trim();
      const key = (code || name).toLowerCase();
      if (!key) continue;

      mapByCode.set(key, {
        courseCode: code || 'N/A',
        courseName: name || 'Unknown Course',
        credits: null,
        courseType: sub.courseType || null,
        semester: attendance.metadata.semester,
        faculty: sub.faculty || null,
        section: attendance.metadata.section,
        slot: null,
        location: null,
      });
    }
  }

  // 2. From Grades
  if (grades && grades.courses) {
    for (const gc of grades.courses) {
      const code = (gc.code || '').trim();
      const name = (gc.name || '').trim();
      const key = (code || name).toLowerCase();
      if (!key) continue;

      const existing = mapByCode.get(key);
      if (existing) {
        if (gc.credits !== null) existing.credits = gc.credits;
        if (gc.courseType && !existing.courseType) existing.courseType = gc.courseType;
      } else {
        mapByCode.set(key, {
          courseCode: code || 'N/A',
          courseName: name || 'Unknown Course',
          credits: gc.credits,
          courseType: gc.courseType,
          semester: grades.semester,
          faculty: null,
          section: null,
          slot: null,
          location: null,
        });
      }
    }
  }

  // 3. From Timetable Course Details
  if (timetable && timetable.courseDetails) {
    for (const cd of timetable.courseDetails) {
      const code = (cd.courseCode || '').trim();
      const name = (cd.courseName || '').trim();
      const key = (code || name).toLowerCase();
      if (!key) continue;

      const credNum = cd.credit ? parseFloat(cd.credit) : null;
      const existing = mapByCode.get(key);
      if (existing) {
        if (!isNaN(credNum as number) && credNum !== null) existing.credits = credNum;
        if (cd.faculty && !existing.faculty) existing.faculty = cd.faculty;
        if (cd.slot && !existing.slot) existing.slot = cd.slot;
        if (cd.location || cd.roomName) existing.location = cd.roomName || cd.location;
      } else {
        mapByCode.set(key, {
          courseCode: code || 'N/A',
          courseName: name || 'Unknown Course',
          credits: !isNaN(credNum as number) ? credNum : null,
          courseType: null,
          semester: timetable.semester || null,
          faculty: cd.faculty || null,
          section: timetable.section || null,
          slot: cd.slot || null,
          location: cd.roomName || cd.location || null,
        });
      }
    }
  }

  return Array.from(mapByCode.values());
}
