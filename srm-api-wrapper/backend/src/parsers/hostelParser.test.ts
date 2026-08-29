import assert from 'assert';
import { parseHostelBookingPage } from './hostelBookingParser';
import { parseHostelDetailsPage, validateHostelDetailsPage } from './hostelDetailsParser';
import { parseHostelWillingnessPage } from './hostelWillingnessParser';

console.log('Running hostel subpage parser and validation unit tests...');

const htmlPersonalDetailsSample = `
  <html>
    <head><title>Student Portal</title></head>
    <body>
      <div id="layoutSidenav">
        <a class="nav-link navmenu active">Personal Details</a>
      </div>
      <div class="card-header bg-custom text-white">Parent Details</div>
      <table>
        <tbody>
          <tr>
            <td>Father Name</td>
            <td>John Doe</td>
          </tr>
        </tbody>
      </table>
      <div class="card-header bg-custom text-white">Address for communication</div>
    </body>
  </html>
`;

const htmlHostelDetailsSample = `
  <html>
    <body>
      <div class="alert alert-info">Hostel Allotment has been confirmed.</div>
      <table class="details-table">
        <tbody>
          <tr>
            <td>Hostel Name</td>
            <td>Paari House</td>
          </tr>
          <tr>
            <td>Room Number</td>
            <td>302</td>
          </tr>
          <tr>
            <td>Room Type</td>
            <td>3 Sharing Non-AC</td>
          </tr>
        </tbody>
      </table>
      
      <table class="payment-table">
        <thead>
          <tr>
            <th>Receipt No</th>
            <th>Amount Paid</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>REC10293</td>
            <td>125000</td>
            <td>Paid</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

function testHostelDetailsParser() {
  const result = parseHostelDetailsPage(htmlHostelDetailsSample);
  
  // Alert/Status text extraction
  assert.strictEqual(result.statusText, 'Hostel Allotment has been confirmed.');

  // Label value pairs
  assert.strictEqual(result.labelValues['Hostel Name'], 'Paari House');
  assert.strictEqual(result.labelValues['Room Number'], '302');
  assert.strictEqual(result.labelValues['Room Type'], '3 Sharing Non-AC');

  // Tables
  assert.strictEqual(result.tables.length, 2);
  const payTable = result.tables.find(t => t.headers.includes('Receipt No'));
  assert.ok(payTable);
  assert.strictEqual(payTable?.rows[0]['Receipt No'], 'REC10293');
  
  console.log('✅ testHostelDetailsParser passed');
}

function testHostelDetailsValidation() {
  // Personal Details page html should fail validation as a details page
  const invalidResult = validateHostelDetailsPage(htmlPersonalDetailsSample);
  assert.strictEqual(invalidResult.isValid, false);
  assert.ok(invalidResult.message?.includes('opened the Personal Details page'));

  // Valid hostel page html should pass validation
  const validResult = validateHostelDetailsPage(htmlHostelDetailsSample);
  assert.strictEqual(validResult.isValid, true);

  console.log('✅ testHostelDetailsValidation passed');
}

function testHostelBookingParser() {
  const result = parseHostelBookingPage(htmlHostelDetailsSample);
  assert.strictEqual(result.labelValues['Hostel Name'], 'Paari House');
  assert.strictEqual(result.tables.length, 2);
  console.log('✅ testHostelBookingParser passed');
}

function testHostelWillingnessParser() {
  const result = parseHostelWillingnessPage(htmlHostelDetailsSample);
  assert.strictEqual(result.labelValues['Hostel Name'], 'Paari House');
  assert.strictEqual(result.tables.length, 2);
  console.log('✅ testHostelWillingnessParser passed');
}

try {
  testHostelDetailsParser();
  testHostelDetailsValidation();
  testHostelBookingParser();
  testHostelWillingnessParser();
  console.log('\n🎉 ALL HOSTEL PARSER TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILURE:', error);
  process.exit(1);
}
