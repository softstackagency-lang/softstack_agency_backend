# Firebase Validation Tests

Test the validation by running these scenarios:

## Test 1: Wrong Project ID

Replace `project_id` in `firebase-service-account.json` with a different value:
```json
"project_id": "wrong-project-id"
```

**Expected Result:**
```
❌ Wrong Firebase project! Expected 'bdstack-c7f75', got 'wrong-project-id'
```

## Test 2: Missing Fields

Remove a required field like `private_key` from the JSON file.

**Expected Result:**
```
❌ Firebase service account is missing required fields: private_key
```

## Test 3: Invalid private_key Format

Replace private_key with invalid content:
```json
"private_key": "invalid-key-format"
```

**Expected Result:**
```
❌ Invalid private_key format. Must be a valid PEM-encoded private key.
```

## Test 4: Wrong Service Account Type

Change the type field:
```json
"type": "user_account"
```

**Expected Result:**
```
❌ Invalid service account type. Expected 'service_account', got 'user_account'
```

## Test 5: Missing Environment Variables

Remove variables from `.env` file and try to start:

```bash
npm run dev
```

**Expected Result:**
```
❌ Environment Configuration Error:
Missing required environment variables: MONGODB_URI, FIREBASE_API_KEY
```

## Running Validation

### Check Setup (without starting server)
```bash
npm run check
```

### Start Development (validates on startup)
```bash
npm run dev
```

Both commands will validate:
- ✅ All required environment variables exist
- ✅ Firebase service account file exists
- ✅ Firebase service account has correct structure
- ✅ Project ID matches 'bdstack-c7f75'
- ✅ All required fields are present
- ✅ Fields have valid formats

## Validation Rules

### Firebase Service Account Must Have:
1. Correct `project_id`: `bdstack-c7f75`
2. Type: `service_account`
3. All required fields:
   - type
   - project_id
   - private_key_id
   - private_key (PEM format)
   - client_email
   - client_id
   - auth_uri
   - token_uri
   - auth_provider_x509_cert_url
   - client_x509_cert_url

### Environment Variables Must Have:
1. MONGODB_URI (must start with mongodb:// or mongodb+srv://)
2. FIREBASE_API_KEY
3. JWT_SECRET
4. ADMIN_SECRET
5. SMTP_USER (for email)
6. SMTP_PASS (for email)

## Error Messages You Might See

| Error | Cause | Solution |
|-------|-------|----------|
| Firebase service account file not found | File missing | Download from Firebase Console |
| Wrong Firebase project | Wrong JSON file | Use correct project's service account |
| Missing required fields | Incomplete JSON | Download complete file from Firebase |
| Invalid JSON | Corrupted file | Re-download the file |
| Missing environment variables | .env not configured | Copy from .env.example and fill in |
| Invalid MONGODB_URI | Wrong format | Use mongodb:// or mongodb+srv:// |
