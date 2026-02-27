/**
 * Validates Firebase service account configuration
 */

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

const EXPECTED_PROJECT_ID = 'bdstack-c7f75';

export class FirebaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseValidationError';
  }
}

/**
 * Validates the Firebase service account structure and content
 * @throws {FirebaseValidationError} if validation fails
 */
export function validateFirebaseServiceAccount(serviceAccount: any): void {
  // Check if it's an object
  if (!serviceAccount || typeof serviceAccount !== 'object') {
    throw new FirebaseValidationError('Firebase service account must be a valid JSON object');
  }

  // Required fields
  const requiredFields: (keyof FirebaseServiceAccount)[] = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
    'auth_provider_x509_cert_url',
    'client_x509_cert_url',
  ];

  // Check for missing fields
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  if (missingFields.length > 0) {
    throw new FirebaseValidationError(
      `Missing required fields in Firebase service account: ${missingFields.join(', ')}`
    );
  }

  // Validate type
  if (serviceAccount.type !== 'service_account') {
    throw new FirebaseValidationError(
      `Invalid service account type. Expected 'service_account', got '${serviceAccount.type}'`
    );
  }

  // Validate project_id matches expected project
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
    throw new FirebaseValidationError(
      `Wrong Firebase project! Expected '${EXPECTED_PROJECT_ID}', got '${serviceAccount.project_id}'. ` +
      'Please use the correct Firebase service account file for this project.'
    );
  }

  // Validate client_email format
  if (!serviceAccount.client_email.includes('@') ||
      !serviceAccount.client_email.includes('.iam.gserviceaccount.com')) {
    throw new FirebaseValidationError(
      `Invalid client_email format: ${serviceAccount.client_email}`
    );
  }

  // Validate private_key format
  if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY') ||
      !serviceAccount.private_key.includes('END PRIVATE KEY')) {
    throw new FirebaseValidationError(
      'Invalid private_key format. Must be a valid PEM-encoded private key.'
    );
  }

  // Validate auth_uri
  if (!serviceAccount.auth_uri.startsWith('https://accounts.google.com')) {
    throw new FirebaseValidationError(
      `Invalid auth_uri: ${serviceAccount.auth_uri}`
    );
  }

  // Validate token_uri
  if (!serviceAccount.token_uri.startsWith('https://oauth2.googleapis.com')) {
    throw new FirebaseValidationError(
      `Invalid token_uri: ${serviceAccount.token_uri}`
    );
  }

  // Validate client_email matches project
  if (!serviceAccount.client_email.includes(EXPECTED_PROJECT_ID)) {
    throw new FirebaseValidationError(
      `Client email '${serviceAccount.client_email}' does not match project '${EXPECTED_PROJECT_ID}'`
    );
  }
}

/**
 * Validates environment variables required for the application
 * @throws {Error} if validation fails
 */
export function validateEnvironmentVariables(): void {
  const required = [
    'MONGODB_URI',
    'FIREBASE_API_KEY',
    'JWT_SECRET',
    'ADMIN_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }

  // Validate MONGODB_URI format
  if (!process.env.MONGODB_URI?.startsWith('mongodb')) {
    throw new Error('Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
  }

  // Validate JWT_SECRET is not default
  if (process.env.JWT_SECRET && (
      process.env.JWT_SECRET === 'dev-secret' ||
      process.env.JWT_SECRET === 'super-secret-jwt' ||
      process.env.JWT_SECRET.includes('your-')
  )) {
    console.warn('⚠️  WARNING: Using default or example JWT_SECRET. Change this in production!');
  }

  // Validate ADMIN_SECRET is not default
  if (process.env.ADMIN_SECRET && (
      process.env.ADMIN_SECRET === 'super-admin-secret' ||
      process.env.ADMIN_SECRET.includes('your-')
  )) {
    console.warn('⚠️  WARNING: Using default or example ADMIN_SECRET. Change this in production!');
  }
}
