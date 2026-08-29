import assert from 'assert';
import { parseAttendance } from './attendanceParser';

console.log('Running attendanceParser unit tests...');

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 1: Correct attendance table with theory + lab, multiple subjects
// ─────────────────────────────────────────────────────────────────────────────
const htmlCorrectTable = `
  <html>
    <body>
      <div>Semester: 5 | Academic Year: 2026-2027 | Section: C</div>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Course Type</th>
            <th>Faculty Name</th>
            <th>Held</th>
            <th>Attended</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>18CSE301T</td>
            <td>Database Management Systems</td>
            <td>Theory</td>
            <td>Dr. John Doe</td>
            <td>40</td>
            <td>38</td>
            <td>95%</td>
            <td>Eligible</td>
          </tr>
          <tr>
            <td>18CSE301L</td>
            <td>Database Management Systems Lab</td>
            <td>Lab</td>
            <td>Mrs. Jane Doe</td>
            <td>20</td>
            <td>18</td>
            <td>90.0</td>
            <td>Eligible</td>
          </tr>
          <tr>
            <td>18CSE302T</td>
            <td>Computer Networks</td>
            <td>Theory</td>
            <td>Dr. Smith</td>
            <td>40</td>
            <td>28</td>
            <td>70%</td>
            <td>Not Eligible</td>
          </tr>
          <tr class="summary">
            <td>Total</td>
            <td>Overall Total</td>
            <td>-</td>
            <td>-</td>
            <td>100</td>
            <td>84</td>
            <td>84.00%</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

function testCorrectTable() {
  const result = parseAttendance(htmlCorrectTable);
  
  // Metadata check
  assert.strictEqual(result.metadata.semester, '5');
  assert.strictEqual(result.metadata.academicYear, '2026-2027');
  assert.strictEqual(result.metadata.section, 'C');

  // Subjects length check (excluding the summary row)
  assert.strictEqual(result.subjects.length, 3);

  // Subject 1 (Theory)
  const sub1 = result.subjects[0];
  assert.strictEqual(sub1.courseCode, '18CSE301T');
  assert.strictEqual(sub1.courseName, 'Database Management Systems');
  assert.strictEqual(sub1.courseType, 'Theory');
  assert.strictEqual(sub1.faculty, 'Dr. John Doe');
  assert.strictEqual(sub1.classesHeld, 40);
  assert.strictEqual(sub1.classesAttended, 38);
  assert.strictEqual(sub1.percentage, 95);
  assert.strictEqual(sub1.status, 'Eligible');

  // Subject 2 (Lab)
  const sub2 = result.subjects[1];
  assert.strictEqual(sub2.courseCode, '18CSE301L');
  assert.strictEqual(sub2.courseName, 'Database Management Systems Lab');
  assert.strictEqual(sub2.courseType, 'Lab');
  assert.strictEqual(sub2.faculty, 'Mrs. Jane Doe');
  assert.strictEqual(sub2.classesHeld, 20);
  assert.strictEqual(sub2.classesAttended, 18);
  assert.strictEqual(sub2.percentage, 90);
  assert.strictEqual(sub2.status, 'Eligible');

  // Overall totals from the total/summary row
  assert.strictEqual(result.overallPercentage, 84);
  assert.strictEqual(result.totalHeld, 100);
  assert.strictEqual(result.totalAttended, 84);

  console.log('✅ testCorrectTable passed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 2: Missing optional fields (e.g. Type, Faculty, Status empty or missing)
// ─────────────────────────────────────────────────────────────────────────────
const htmlMissingFields = `
  <html>
    <body>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Held</th>
            <th>Attended</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>18CSE101</td>
            <td>Introduction to Programming</td>
            <td>30</td>
            <td>27</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

function testMissingFields() {
  const result = parseAttendance(htmlMissingFields);
  
  assert.strictEqual(result.subjects.length, 1);
  const sub = result.subjects[0];
  assert.strictEqual(sub.courseCode, '18CSE101');
  assert.strictEqual(sub.courseName, 'Introduction to Programming');
  assert.strictEqual(sub.courseType, null);
  assert.strictEqual(sub.faculty, null);
  assert.strictEqual(sub.classesHeld, 30);
  assert.strictEqual(sub.classesAttended, 27);
  // Calculates percentage automatically since held & attended are present
  assert.strictEqual(sub.percentage, 90);
  assert.strictEqual(sub.status, null);

  // Overall should be calculated since sumHeld > 0
  assert.strictEqual(result.overallPercentage, 90);
  assert.strictEqual(result.totalHeld, 30);
  assert.strictEqual(result.totalAttended, 27);

  console.log('✅ testMissingFields passed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 3: Empty table (headers only, no data rows)
// ─────────────────────────────────────────────────────────────────────────────
const htmlEmptyTable = `
  <html>
    <body>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Held</th>
            <th>Attended</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    </body>
  </html>
`;

function testEmptyTable() {
  const result = parseAttendance(htmlEmptyTable);
  
  assert.strictEqual(result.subjects.length, 0);
  assert.strictEqual(result.overallPercentage, null);
  assert.strictEqual(result.totalHeld, null);
  assert.strictEqual(result.totalAttended, null);

  console.log('✅ testEmptyTable passed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 4: Unexpected rows (repeated headers, garbage row, empty cells)
// ─────────────────────────────────────────────────────────────────────────────
const htmlUnexpectedRows = `
  <html>
    <body>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Held</th>
            <th>Attended</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>18CSE201</td>
            <td>Data Structures</td>
            <td>45</td>
            <td>45</td>
            <td>100%</td>
          </tr>
          <tr>
            <td>Course Code</td>
            <td>Course Name</td>
            <td>Held</td>
            <td>Attended</td>
            <td>Percentage</td>
          </tr>
          <tr>
            <td>GarbageRow</td>
            <td>Some garbage info</td>
            <td>InvalidHeld</td>
            <td>InvalidAttended</td>
            <td>NoPct</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

function testUnexpectedRows() {
  const result = parseAttendance(htmlUnexpectedRows);
  
  // Repeated header row and empty rows are skipped
  // "GarbageRow" might be parsed as a subject but invalid numbers should be null
  const subjects = result.subjects;
  
  // Valid subject
  const sub1 = subjects.find(s => s.courseCode === '18CSE201');
  assert.ok(sub1);
  assert.strictEqual(sub1?.classesHeld, 45);
  assert.strictEqual(sub1?.classesAttended, 45);
  assert.strictEqual(sub1?.percentage, 100);

  // Repeated header should NOT be present as a subject
  const repeatedHeaderSub = subjects.find(s => s.courseCode === 'Course Code');
  assert.strictEqual(repeatedHeaderSub, undefined);

  // The empty row should NOT be present
  const emptySub = subjects.find(s => !s.courseCode && !s.courseName);
  assert.strictEqual(emptySub, undefined);

  console.log('✅ testUnexpectedRows passed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 5: Different percentage formats (92.4, 75, Not Available, 80%, etc.)
// ─────────────────────────────────────────────────────────────────────────────
const htmlDifferentPercentageFormats = `
  <html>
    <body>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Held</th>
            <th>Attended</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SUB1</td>
            <td>Subject 1</td>
            <td>100</td>
            <td>92</td>
            <td>92.4%</td>
          </tr>
          <tr>
            <td>SUB2</td>
            <td>Subject 2</td>
            <td>100</td>
            <td>75</td>
            <td>75</td>
          </tr>
          <tr>
            <td>SUB3</td>
            <td>Subject 3</td>
            <td>100</td>
            <td>0</td>
            <td>Not Available</td>
          </tr>
          <tr>
            <td>SUB4</td>
            <td>Subject 4</td>
            <td>100</td>
            <td>80</td>
            <td>80%</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

function testDifferentPercentageFormats() {
  const result = parseAttendance(htmlDifferentPercentageFormats);
  
  assert.strictEqual(result.subjects.length, 4);

  // 92.4% -> 92.4
  assert.strictEqual(result.subjects[0].percentage, 92.4);

  // 75 -> 75
  assert.strictEqual(result.subjects[1].percentage, 75);

  // Not Available -> null (since no numbers)
  assert.strictEqual(result.subjects[2].percentage, null);

  // 80% -> 80
  assert.strictEqual(result.subjects[3].percentage, 80);

  console.log('✅ testDifferentPercentageFormats passed');
}

// Execute all tests
try {
  testCorrectTable();
  testMissingFields();
  testEmptyTable();
  testUnexpectedRows();
  testDifferentPercentageFormats();
  console.log('\n🎉 ALL ATTENDANCE PARSER TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILURE:', error);
  process.exit(1);
}
