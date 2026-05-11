// QR Code Format Examples

console.log("=== QR CODE FORMATS ===\n");

// Full-time employee
const fullTimeQR = "employer:123-456:employer@example.com:full_time";
console.log("Full-time QR:");
console.log(fullTimeQR);
console.log("Parts count:", fullTimeQR.split(':').length);
console.log("");

// Part-time employee
const partTimeConfig = {
  workingHoursPerDay: 8,
  monthlyWage: 2000,
  workingDaysPerMonth: 22
};
const partTimeQR = `employer:123-456:employer@example.com:part_time:${JSON.stringify(partTimeConfig)}`;
console.log("Part-time QR:");
console.log(partTimeQR);
console.log("Parts count:", partTimeQR.split(':').length);
console.log("");

// Contract employee
const contractQR = "employer:123-456:employer@example.com:contract";
console.log("Contract QR:");
console.log(contractQR);
console.log("Parts count:", contractQR.split(':').length);
console.log("");

// Test parsing
console.log("=== PARSING TEST ===\n");

function testParse(qrCode, label) {
  console.log(`Testing ${label}:`);
  const parts = qrCode.split(':');
  console.log(`  Parts count: ${parts.length}`);
  console.log(`  Valid: ${(parts.length >= 3 && parts.length <= 5) && parts[0] === 'employer'}`);
  
  if (parts.length >= 3) {
    const employerId = parts[1];
    const employmentType = parts.length >= 4 ? parts[3] : 'full_time';
    console.log(`  Employer ID: ${employerId}`);
    console.log(`  Employment Type: ${employmentType}`);
    
    if (parts.length === 5 && parts[4] && parts[4].trim() !== '') {
      try {
        const config = JSON.parse(parts[4]);
        console.log(`  Part-time Config:`, config);
      } catch (e) {
        console.log(`  Config parse error: ${e.message}`);
      }
    }
  }
  console.log("");
}

testParse(fullTimeQR, "Full-time");
testParse(partTimeQR, "Part-time");
testParse(contractQR, "Contract");
