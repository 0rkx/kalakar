# 🚀 Kalakar App - Complete Hosting Guide

This guide covers everything you need to deploy the Kalakar app to production, including both the frontend and backend components.

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Google Cloud account with billing enabled
- Gemini API key from Google AI Studio

## 🏗️ Architecture Overview

The Kalakar app consists of:
- **Frontend**: React/Vite app (can be hosted on Firebase Hosting, Vercel, Netlify)
- **Backend**: Express.js server (can be hosted on Railway, Render, Google Cloud Run)
- **Firebase Services**: Authentication, Firestore, Storage, Functions

## 🔧 Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd kalakar-app
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 2. Environment Variables

Create `.env.local` in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend Configuration
GEMINI_API_KEY=your_gemini_api_key

# Development Settings
VITE_MODE=production
NODE_ENV=production
```

Create `backend/.env` for backend server:

```env
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
PORT=3001
```

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name and follow setup steps
4. Enable Google Analytics (optional)

### 2. Enable Firebase Services

In Firebase Console, enable:
- **Authentication** → Sign-in method → Email/Password
- **Firestore Database** → Create database in production mode
- **Storage** → Create default bucket
- **Hosting** (if using Firebase Hosting)

### 3. Configure Firebase CLI

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting (if using Firebase Hosting)
# - Storage

# Set your project ID in .firebaserc
```

Update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 4. Deploy Firebase Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## 🌐 Frontend Hosting Options

### Option 1: Firebase Hosting (Recommended)

```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be available at: `https://your-project-id.web.app`

### Option 2: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project root
3. Follow prompts and add environment variables in Vercel dashboard

### Option 3: Netlify

1. Build the project: `npm run build`
2. Drag `dist` folder to [Netlify Drop](https://app.netlify.com/drop)
3. Or connect GitHub repo for automatic deployments

## 🖥️ Backend Hosting Options

### Option 1: Railway (Recommended)

1. Go to [Railway](https://railway.app)
2. Connect your GitHub repository
3. Select the `backend` folder as root
4. Add environment variables:
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
   - `PORT=3001`
5. Deploy automatically

### Option 2: Render

1. Go to [Render](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Set:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add environment variables

### Option 3: Google Cloud Run

```bash
# Build Docker image
cd backend
docker build -t kalakar-backend .

# Push to Google Container Registry
docker tag kalakar-backend gcr.io/your-project-id/kalakar-backend
docker push gcr.io/your-project-id/kalakar-backend

# Deploy to Cloud Run
gcloud run deploy kalakar-backend \
  --image gcr.io/your-project-id/kalakar-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 🔑 API Keys Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy the key (starts with `AIzaSy...`)

### 2. Firebase Configuration

Get Firebase config from:
1. Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Copy the config object values

## 🔒 Security Configuration

### 1. Firestore Security Rules

Update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products are readable by authenticated users
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 2. Storage Security Rules

Update `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. CORS Configuration

For backend server, ensure CORS is properly configured:

```javascript
app.use(cors({
  origin: [
    'https://your-frontend-domain.com',
    'https://your-project-id.web.app',
    'https://your-project-id.firebaseapp.com'
  ],
  credentials: true
}));
```

## 📊 Monitoring and Analytics

### 1. Firebase Analytics

Enable in Firebase Console → Analytics

### 2. Error Monitoring

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for user behavior

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] All API keys configured
- [ ] Environment variables set
- [ ] Firebase project created and configured
- [ ] Security rules updated
- [ ] CORS configured for production domains

### Frontend Deployment

- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] Domain configured (if custom domain)
- [ ] SSL certificate active

### Backend Deployment

- [ ] Server starts without errors
- [ ] All endpoints responding
- [ ] Database connections working
- [ ] File uploads working
- [ ] CORS configured for frontend domain

### Post-deployment

- [ ] Test all major features
- [ ] Verify authentication flow
- [ ] Test image upload and processing
- [ ] Check voice recognition functionality
- [ ] Monitor error logs

## 🔧 Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Verify API keys and project ID
   - Check Firebase service status

2. **CORS errors**
   - Update backend CORS configuration
   - Verify frontend domain in allowed origins

3. **Gemini API errors**
   - Verify API key is correct
   - Check API quotas and billing

4. **Build failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility

### Logs and Debugging

- **Frontend**: Browser developer tools
- **Backend**: Server logs (Railway/Render dashboard)
- **Firebase**: Firebase Console → Functions logs
- **Functions**: `firebase functions:log`

## 📈 Scaling Considerations

### Performance Optimization

- Enable CDN for static assets
- Implement image optimization
- Use Firebase Performance Monitoring
- Consider implementing caching strategies

### Cost Optimization

- Monitor Firebase usage in console
- Set up billing alerts
- Optimize Firestore queries
- Use Firebase Storage lifecycle rules

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Firebase Console for error messages
3. Check server logs in your hosting platform
4. Verify all environment variables are set correctly

## 🎉 Success!

Once deployed, your Kalakar app will be live and ready to help artisans create beautiful product listings with AI assistance!

**Frontend URL**: Your hosting platform will provide this
**Backend URL**: Your backend hosting platform will provide this
**Firebase Console**: `https://console.firebase.google.com/project/your-project-id`