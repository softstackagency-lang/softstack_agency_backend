# Server Setup Checklist

When setting up this project on a new machine, complete these steps:

## ✅ Setup Checklist

- [ ] Install Node.js (v16+)
- [ ] Clone the repository
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Update `.env` with actual credentials:
  - [ ] MONGODB_URI (from MongoDB Atlas)
  - [ ] FIREBASE_API_KEY (from Firebase Console)
  - [ ] JWT_SECRET (generate a random string)
  - [ ] ADMIN_SECRET (generate a random string)
  - [ ] SMTP credentials (Gmail App Password)
- [ ] Download Firebase service account JSON:
  - [ ] Go to Firebase Console > Project Settings > Service Accounts
  - [ ] Generate New Private Key
  - [ ] Save as `src/config/firebase-service-account.json`
- [ ] Run `npm run dev` to test
- [ ] Verify MongoDB connection
- [ ] Verify Firebase authentication

## Common Issues

### "Cannot find module './config/firebase-service-account.json'"
- Download the Firebase service account file
- Place it in `src/config/firebase-service-account.json`

### "MongoServerError: bad auth"
- Check MONGODB_URI in .env
- Verify database user credentials
- Check IP whitelist in MongoDB Atlas

### "Firebase: Error (auth/invalid-api-key)"
- Verify FIREBASE_API_KEY in .env
- Check Firebase project configuration

### SMTP/Email errors
- Use Gmail App Password (not regular password)
- Enable 2FA to generate App Passwords
- Go to: https://myaccount.google.com/apppasswords

## Quick Commands

```bash
# Setup (first time)
chmod +x setup.sh
./setup.sh

# Validate configuration
npm run check

# Development
npm run dev

# Production build
npm run build
npm start
```

## Validation

The project includes automatic validation that checks:

✅ **Firebase Service Account:**
- File exists at `src/config/firebase-service-account.json`
- Has all required fields (type, project_id, private_key, etc.)
- Project ID matches `bdstack-c7f75` (your project)
- Private key is in valid PEM format
- Client email is valid

✅ **Environment Variables:**
- All required variables are set (.env file)
- MONGODB_URI has correct format
- No example/placeholder values in production

**Run validation anytime:**
```bash
npm run check
```

The validation runs automatically when you start the server with `npm run dev`.
