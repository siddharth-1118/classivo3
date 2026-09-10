import assert from 'assert';
import { buildUnifiedMarks } from './unifiedMarksParser';
import { extractStudentCourses } from './courseParser';

function testUnifiedMarks() {
  console.log('Running unifiedMarksParser unit tests...');

  const mockInternal = {
    metadata: { semester: '1', academicYear: '2026-2027' },
    subjects: [
      {
        courseCode: '18CSC201J',
        courseName: 'Data Structures and Algorithms',
        courseType: 'THEORY',
        faculty: 'Dr. Smith',
        components: { IA1: 18, IA2: 19, Assignment: 10 },
        total: 47,
        maxMarks: 50,
        obtainedMarks: 47,
        status: 'Pass',
        remarks: 'Good',
        semester: '1',
        academicYear: '2026-2027',
        _raw: {},
      }
    ],
    tables: [],
    _tablesFound: 1,
    _rowsFound: 1
  };

  const mockGrades = {
    semester: '1',
    academicYear: '2026-2027',
    courses: [
      {
        code: '18CSC201J',
        name: 'Data Structures and Algorithms',
        internalMarks: 47,
        externalMarks: 45,
        totalMarks: 92,
        grade: 'O',
        gradePoint: 10,
        credits: 4,
        status: 'Pass',
        courseType: 'THEORY',
        monthYear: 'Dec 2026',
        _raw: {}
      }
    ],
    summary: { totalCredits: 4, sgpa: 10, cgpa: 10, gpa: 10 },
    semesters: [],
    overallSummary: { cgpa: 10, creditsRegistered: 20, creditsEarned: 20, creditsRequired: 160 },
    _rawHeaders: []
  };

  const result = buildUnifiedMarks(mockInternal as any, mockGrades as any);

  assert.strictEqual(result.subjects.length, 1);
  assert.strictEqual(result.subjects[0].courseCode, '18CSC201J');
  assert.strictEqual(result.subjects[0].assessments.length, 3);
  assert.strictEqual(result.subjects[0].grade, 'O');
  assert.strictEqual(result.subjects[0].total, 92);
  assert.strictEqual(result.summary?.cgpa, 10);

  console.log('✅ testUnifiedMarks passed');
}

function testExtractCourses() {
  console.log('Running courseParser unit tests...');

  const mockAtt = {
    metadata: { semester: '1', section: 'A' },
    subjects: [
      {
        courseCode: '18CSC201J',
        courseName: 'Data Structures and Algorithms',
        courseType: 'THEORY',
        faculty: 'Dr. Smith',
      }
    ]
  };

  const mockGrades = {
    semester: '1',
    courses: [
      {
        code: '18CSC201J',
        name: 'Data Structures and Algorithms',
        credits: 4,
        courseType: 'THEORY',
      }
    ]
  };

  const courses = extractStudentCourses(mockAtt as any, mockGrades as any, null);

  assert.strictEqual(courses.length, 1);
  assert.strictEqual(courses[0].courseCode, '18CSC201J');
  assert.strictEqual(courses[0].credits, 4);

  console.log('✅ testExtractCourses passed');
}

testUnifiedMarks();
testExtractCourses();

console.log('\n🎉 UNIFIED MARKS & COURSE PARSER TESTS PASSED SUCCESSFULLY! 🎉\n');
