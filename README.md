# Server (Express + TypeScript)

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB Atlas account or local MongoDB instance
- Firebase project with Admin SDK credentials
- Gmail account with App Password (for email functionality)

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (random secure string)
- `FIREBASE_API_KEY` - Firebase API key
- `ADMIN_SECRET` - Admin authentication secret (random secure string)
- `SMTP_USER` & `SMTP_PASS` - Your email and app password
- `FRONTEND_URL` - Frontend application URL

### 3. Firebase Service Account Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `src/config/firebase-service-account.json`

**Important:** Never commit this file to Git (it's already in .gitignore)

### 4. Development

```bash
npm run dev
```

This runs the server on `http://localhost:4000` by default (or the PORT you specified in `.env`).

### 5. Build and Start (Production)

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middlewares/      # Express middlewares
├── models/          # Database models and routes
├── routes/          # API route definitions
├── db.ts            # MongoDB Mongoose connection
├── firebase.ts      # Firebase Admin setup
├── emailService.ts  # Email sending service
└── index.ts         # Main application entry
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/auth/*` - Authentication endpoints
- `GET /api/products/*` - Product endpoints
- And more... (see routes folder)

## Architecture Notes

This project uses two MongoDB connection modules:
- `src/db.ts` - Legacy connection with collection helpers, indexes, and type interfaces (used by auth, user, product routes)
- `src/config/db.ts` - Newer native driver connection (used by newer modules: pricing, products, projects, services, team)

Both connections point to the same database and work concurrently.

## Deployment

This project is configured for Vercel deployment. The `vercel.json` file handles serverless configuration.

## Troubleshooting

### Database Connection Issues
- Verify your `MONGODB_URI` is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure network connectivity

### Firebase Authentication Issues
- Verify `firebase-service-account.json` is in the correct location
- Check Firebase project settings
- Ensure API key is valid

### Email Sending Issues
- Use Gmail App Password (not your regular password)
- Enable 2FA on your Gmail account to generate App Passwords
- Verify SMTP settings are correct

## Support

For issues, please check the logs or contact the development team.

---

## 🚀 For Team Members - Getting Started

If you're setting up this project on your machine for the first time:

### Option 1: Automated Setup (Recommended)

```bash
git clone <repository-url>
cd server
./setup.sh
```

Then run `npm run check` to verify your configuration.

### Option 2: Manual Setup

Follow the steps in `SETUP.md` for detailed instructions.

### Verify Your Setup

Run this command to check if everything is configured correctly:

```bash
npm run check
```

This will validate:
- Environment variables
- Firebase service account
- Dependencies
- TypeScript compilation

**Note:** You need to provide your own:
1. MongoDB connection string
2. Firebase service account JSON file
3. Gmail app password for SMTP
4. JWT and admin secrets

See `.env.example` for required variables.
