import assert from 'assert';
import { parseGradePage } from './gradeParser';

console.log('Running gradeParser unit tests...');

const htmlGradesSample = `
  <html>
    <body>
      <div>Semester: 3 | Academic Year: 2025-2026</div>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Internal</th>
            <th>External</th>
            <th>Total Marks</th>
            <th>Grade</th>
            <th>Grade Point</th>
            <th>Credits</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>18CSE201J</td>
            <td>Data Structures and Algorithms</td>
            <td>38</td>
            <td>45</td>
            <td>83</td>
            <td>A+</td>
            <td>9.0</td>
            <td>4</td>
            <td>Pass</td>
          </tr>
          <tr>
            <td>18MAB201T</td>
            <td>Discrete Mathematics</td>
            <td>40</td>
            <td>50</td>
            <td>90</td>
            <td>O</td>
            <td>10.0</td>
            <td>4</td>
            <td>Pass</td>
          </tr>
        </tbody>
      </table>
      <div class="summary-info">
        <span>Total Credits: 8</span>
        <span>SGPA: 9.5</span>
        <span>CGPA: 9.2</span>
      </div>
    </body>
  </html>
`;

function testGradeParser() {
  const result = parseGradePage(htmlGradesSample);
  
  assert.strictEqual(result.semester, '3');
  assert.strictEqual(result.academicYear, '2025-2026');
  assert.strictEqual(result.courses.length, 2);

  const course1 = result.courses[0];
  assert.strictEqual(course1.code, '18CSE201J');
  assert.strictEqual(course1.name, 'Data Structures and Algorithms');
  assert.strictEqual(course1.internalMarks, 38);
  assert.strictEqual(course1.externalMarks, 45);
  assert.strictEqual(course1.totalMarks, 83);
  assert.strictEqual(course1.grade, 'A+');
  assert.strictEqual(course1.gradePoint, 9);
  assert.strictEqual(course1.credits, 4);
  assert.strictEqual(course1.status, 'Pass');

  assert.strictEqual(result.summary.totalCredits, 8);
  assert.strictEqual(result.summary.sgpa, 9.5);
  assert.strictEqual(result.summary.cgpa, 9.2);

  console.log('✅ testGradeParser passed');
}

try {
  testGradeParser();
  console.log('\n🎉 ALL GRADE PARSER TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILURE:', error);
  process.exit(1);
}
