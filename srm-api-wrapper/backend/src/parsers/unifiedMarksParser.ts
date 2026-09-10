import { ParsedInternalMarks } from './internalMarksParser';
import { ParsedSemesterGrades } from './gradeParser';

export interface UnifiedAssessment {
  name: string;
  marks: number | null;
  maxMarks: number | null;
}

export interface UnifiedCourseMark {
  courseCode: string;
  courseName: string;
  courseType?: string | null;
  semester?: string | null;
  academicYear?: string | null;
  assessments: UnifiedAssessment[];
  internalMarks?: number | null;
  externalMarks?: number | null;
  total: number | null;
  maxMarks?: number | null;
  grade: string | null;
  gradePoint: number | null;
  status: string | null;
  _source: string;
  _raw?: Record<string, string>;
}

export interface UnifiedMarksResult {
  subjects: UnifiedCourseMark[];
  summary?: {
    cgpa: number | null;
    sgpa: number | null;
    creditsEarned: number | null;
    creditsRegistered: number | null;
  };
  semesters?: any[];
  sources: string[];
}

export function buildUnifiedMarks(
  internalMarks?: ParsedInternalMarks | null,
  gradeCard?: ParsedSemesterGrades | null
): UnifiedMarksResult {
  const mapByCode = new Map<string, UnifiedCourseMark>();
  const sources: string[] = [];

  // 1. Process Internal Marks
  if (internalMarks && internalMarks.subjects && internalMarks.subjects.length > 0) {
    sources.push('internal_marks');
    for (const sub of internalMarks.subjects) {
      const code = (sub.courseCode || '').trim();
      const name = (sub.courseName || '').trim();
      const key = code || name;
      if (!key) continue;

      const assessments: UnifiedAssessment[] = [];
      if (sub.components) {
        for (const [compName, compVal] of Object.entries(sub.components)) {
          if (compVal !== null && compVal !== undefined) {
            assessments.push({
              name: compName,
              marks: compVal,
              maxMarks: null
            });
          }
        }
      }

      const item: UnifiedCourseMark = {
        courseCode: code || 'N/A',
        courseName: name || 'Unknown Course',
        courseType: sub.courseType,
        semester: sub.semester || internalMarks.metadata.semester,
        academicYear: sub.academicYear || internalMarks.metadata.academicYear,
        assessments,
        internalMarks: sub.obtainedMarks ?? sub.total,
        externalMarks: null,
        total: sub.obtainedMarks ?? sub.total,
        maxMarks: sub.maxMarks,
        grade: null,
        gradePoint: null,
        status: sub.status || sub.remarks,
        _source: 'internal_marks',
        _raw: sub._raw,
      };

      mapByCode.set(key.toLowerCase(), item);
    }
  }

  // 2. Process / Merge Grade Card
  if (gradeCard && gradeCard.courses && gradeCard.courses.length > 0) {
    sources.push('grade_card');
    for (const gc of gradeCard.courses) {
      const code = (gc.code || '').trim();
      const name = (gc.name || '').trim();
      const key = (code || name).toLowerCase();

      const existing = mapByCode.get(key);
      if (existing) {
        // Merge grade card info into existing internal mark item
        if (gc.internalMarks !== null) existing.internalMarks = gc.internalMarks;
        if (gc.externalMarks !== null) existing.externalMarks = gc.externalMarks;
        if (gc.totalMarks !== null) existing.total = gc.totalMarks;
        if (gc.grade) existing.grade = gc.grade;
        if (gc.gradePoint !== null) existing.gradePoint = gc.gradePoint;
        if (gc.status) existing.status = gc.status;
        if (gc.courseType && !existing.courseType) existing.courseType = gc.courseType;
      } else {
        // Add new entry from grade card
        const item: UnifiedCourseMark = {
          courseCode: code || 'N/A',
          courseName: name || 'Unknown Course',
          courseType: gc.courseType,
          semester: gradeCard.semester,
          academicYear: gc.monthYear || gradeCard.academicYear,
          assessments: [],
          internalMarks: gc.internalMarks,
          externalMarks: gc.externalMarks,
          total: gc.totalMarks,
          maxMarks: null,
          grade: gc.grade,
          gradePoint: gc.gradePoint,
          status: gc.status,
          _source: 'grade_card',
          _raw: gc._raw,
        };
        mapByCode.set(key, item);
      }
    }
  }

  const subjects = Array.from(mapByCode.values());

  return {
    subjects,
    summary: {
      cgpa: gradeCard?.summary?.cgpa ?? gradeCard?.overallSummary?.cgpa ?? null,
      sgpa: gradeCard?.summary?.sgpa ?? null,
      creditsEarned: gradeCard?.overallSummary?.creditsEarned ?? null,
      creditsRegistered: gradeCard?.overallSummary?.creditsRegistered ?? null,
    },
    semesters: gradeCard?.semesters ?? [],
    sources,
  };
}
