/**
 * Test utility for Firebase data validation and conversion
 * 
 * This script tests the Firebase data service functions with sample email data
 * to ensure proper validation and conversion to the required schema format.
 */

const { validateMessageData, convertEmailToFirebaseFormat } = require('../services/firebaseDataService');

// Sample email data in the format received from fetchEmail.js
const sampleEmail = {
  emailId: 'sample-email-123',
  from: 'John Doe <john.doe@example.com>',
  subject: 'Important Meeting Tomorrow',
  date: new Date('2025-04-25T10:00:00Z'),
  body: 'Hi team, we need to discuss the project progress tomorrow at 10 AM.',
  priority: 'FLOW_ACTION',
  emailUrl: 'https://mail.google.com/mail/u/0/#inbox/sample-email-123'
};

// Test conversion function
console.log('Testing email conversion to Firebase schema format:');
const convertedData = convertEmailToFirebaseFormat(sampleEmail);
console.log(JSON.stringify(convertedData, null, 2));

// Test validation function
console.log('\nValidating converted data against schema:');
const validationResult = validateMessageData(convertedData);

if (validationResult.valid) {
  console.log('✅ Validation passed! Data conforms to the Firebase schema.');
} else {
  console.error('❌ Validation failed with errors:', validationResult.errors);
}

// Test with invalid data
console.log('\nTesting validation with invalid data:');
const invalidData = { 
  type: 'email',
  // Missing required fields
  content: 'Test content',
  // Invalid timestamp type
  timestamp: '2025-04-25',
  priority: 'invalid-priority',
  read: 'not-a-boolean'
};

const invalidValidationResult = validateMessageData(invalidData);
console.log('Expected validation to fail:', !invalidValidationResult.valid);
console.log('Validation errors:', invalidValidationResult.errors);

// If run directly (not imported)
if (require.main === module) {
  console.log('\nThis utility can be used to test the Firebase data service with sample data.');
  console.log('Add more test cases as needed to ensure proper schema validation and conversion.');
}

module.exports = {
  sampleEmail,
  convertedData
};