import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Checking project configuration...\n');

let hasErrors = false;

// Check .env file
if (!fs.existsSync('.env')) {
  console.error('❌ .env file is missing!');
  console.log('   Run: cp .env.example .env');
  hasErrors = true;
} else {
  console.log('✓ .env file exists');

  // Check required env variables
  const envContent = fs.readFileSync('.env', 'utf-8');
  const requiredVars = [
    'MONGODB_URI',
    'FIREBASE_API_KEY',
    'JWT_SECRET',
    'ADMIN_SECRET',
    'SMTP_USER',
    'SMTP_PASS'
  ];

  const missingVars: string[] = [];
  const exampleValues: string[] = [];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`${varName}=(.*)`, 'm');
    const match = envContent.match(regex);

    if (!match || !match[1].trim()) {
      missingVars.push(varName);
    } else if (
      match[1].includes('your_') ||
      match[1].includes('here') ||
      match[1].includes('your-')
    ) {
      exampleValues.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    hasErrors = true;
  }

  if (exampleValues.length > 0) {
    console.warn(`⚠️  These variables still have example values: ${exampleValues.join(', ')}`);
    console.warn('   Please update them with actual credentials');
    hasErrors = true;
  }
}

// Check Firebase service account
const firebasePath = path.join('src', 'config', 'firebase-service-account.json');
if (!fs.existsSync(firebasePath)) {
  console.error('❌ Firebase service account file is missing!');
  console.log('   Location: src/config/firebase-service-account.json');
  console.log('   Download from: Firebase Console > Project Settings > Service Accounts');
  hasErrors = true;
} else {
  console.log('✓ Firebase service account file exists');

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf-8'));

    // Required fields for Firebase service account
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
      'auth_provider_x509_cert_url',
      'client_x509_cert_url'
    ];

    const missingFields = requiredFields.filter(field => !serviceAccount[field]);

    if (missingFields.length > 0) {
      console.error(`❌ Firebase service account is missing required fields: ${missingFields.join(', ')}`);
      hasErrors = true;
    }

    // Validate project_id matches expected project
    if (serviceAccount.project_id !== 'bdstack-c7f75') {
      console.error(`❌ Wrong Firebase project! Expected 'bdstack-c7f75', got '${serviceAccount.project_id}'`);
      console.error('   Please use the correct Firebase service account for this project');
      hasErrors = true;
    }

    // Validate type
    if (serviceAccount.type !== 'service_account') {
      console.error(`❌ Invalid service account type: ${serviceAccount.type}`);
      hasErrors = true;
    }

    // Validate client_email format
    if (!serviceAccount.client_email?.includes('@') || !serviceAccount.client_email?.includes('.iam.gserviceaccount.com')) {
      console.error('❌ Invalid client_email format in Firebase service account');
      hasErrors = true;
    }

    // Validate private_key format
    if (!serviceAccount.private_key?.includes('BEGIN PRIVATE KEY') || !serviceAccount.private_key?.includes('END PRIVATE KEY')) {
      console.error('❌ Invalid private_key format in Firebase service account');
      hasErrors = true;
    }

    if (!missingFields.length && serviceAccount.project_id === 'bdstack-c7f75') {
      console.log(`  ✓ Project: ${serviceAccount.project_id}`);
      console.log(`  ✓ Client: ${serviceAccount.client_email}`);
    }
  } catch (error) {
    console.error('❌ Firebase service account file is invalid JSON');
    console.error('   Make sure the file contains valid JSON data');
    hasErrors = true;
  }
}

// Check node_modules
if (!fs.existsSync('node_modules')) {
  console.error('❌ node_modules not found!');
  console.log('   Run: npm install');
  hasErrors = true;
} else {
  console.log('✓ Dependencies installed');
}

// Check TypeScript compilation
console.log('\n🔨 Checking TypeScript compilation...');
const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✓ TypeScript compilation successful');
} catch (error: any) {
  console.error('❌ TypeScript compilation errors found');
  if (error.stdout) {
    console.log(error.stdout.toString());
  }
  hasErrors = true;
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration incomplete! Please fix the issues above.');
  process.exit(1);
} else {
  console.log('✅ Configuration looks good! You can run: npm run dev');
  process.exit(0);
}
