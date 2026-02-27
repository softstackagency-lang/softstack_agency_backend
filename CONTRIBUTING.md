# Contributing & Sharing Credentials Guide

## 🔐 Security First

**NEVER commit these files:**
- `.env` (contains actual credentials)
- `src/config/firebase-service-account.json` (Firebase private key)
- Any file with real passwords, API keys, or secrets

These files are already in `.gitignore` to prevent accidental commits.

## 📤 Sharing the Project with Team Members

### What to Share via Git:
✅ Source code
✅ `.env.example` (template with placeholder values)
✅ `firebase-service-account.example.json` (template)
✅ `package.json` and dependencies
✅ Documentation (README, SETUP.md)
✅ Configuration files (tsconfig.json, vercel.json)

### What NOT to Share via Git:
❌ `.env` file
❌ `firebase-service-account.json`
❌ `node_modules/`
❌ `dist/` build output

## 🔑 Sharing Credentials Securely

When team members need actual credentials, use these secure methods:

### Option 1: Password Manager (Recommended)
- Use 1Password, LastPass, or Bitwarden
- Create a shared vault for team credentials
- Store `.env` contents and Firebase JSON as secure notes

### Option 2: Encrypted Communication
- Share via encrypted messaging (Signal, encrypted email)
- Use services like https://onetimesecret.com/ for one-time secret links
- Never send via Slack, Discord, or unencrypted email

### Option 3: Environment Variables Management
- Use services like Doppler, Infisical, or Vault
- Team members pull credentials directly from secure vault

## 🔧 Setting Up on a New Machine

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Request credentials from team lead securely
5. Add Firebase service account JSON
6. Run `npm run check` to verify setup
7. Run `npm run dev` to start

## 🔒 Creating Your Own Credentials

For development, team members can create their own:

### MongoDB
1. Create free MongoDB Atlas account
2. Create a new cluster
3. Create database user
4. Whitelist your IP
5. Copy connection string to `.env`

### Firebase
1. Create Firebase project (or get access to existing)
2. Download service account key
3. Save as `src/config/firebase-service-account.json`
4. Add API key to `.env`

### Email (SMTP)
1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`

### Secrets (JWT, Admin)
Generate random strings:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📝 Checklist for New Team Members

- [ ] Git repository cloned
- [ ] Node.js installed (v16+)
- [ ] Received credentials securely
- [ ] Created `.env` from template
- [ ] Added Firebase service account
- [ ] Ran `npm install`
- [ ] Ran `npm run check` (passes)
- [ ] Ran `npm run dev` (server starts)
- [ ] Tested API endpoints

## 🆘 Getting Help

If you're stuck:
1. Check `SETUP.md` for detailed setup instructions
2. Run `npm run check` to diagnose issues
3. Check error messages in terminal
4. Contact team lead for credential access

## 🔄 Production Deployment

For Vercel/production:
1. Add environment variables in Vercel dashboard
2. Add `FIREBASE_SERVICE_ACCOUNT` as JSON string
3. Set `NODE_ENV=production`
4. Deploy via `vercel` command or Git integration
