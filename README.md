# 🎨 Kalakar - AI-Powered Artisan Marketplace

> Empowering artisans worldwide to create professional product listings through AI-powered voice conversations and intelligent image processing.

![Kalakar App](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Firebase](https://img.shields.io/badge/Firebase-10+-orange)

## ✨ Features

### 🎤 Voice-Powered Product Creation
- Natural voice conversations to gather product details
- Multi-language speech recognition
- Intelligent extraction of product information
- Story-driven product descriptions

### 🖼️ AI Image Enhancement
- Professional image cleanup and enhancement
- Background removal and replacement
- Color correction and lighting optimization
- E-commerce ready image processing

### 🤖 Intelligent AI Assistant
- Powered by Google Gemini 2.5 Flash
- Context-aware conversations
- Cultural sensitivity and artisan story preservation
- Smart product categorization and pricing suggestions

### 📱 Modern User Experience
- Mobile-first responsive design
- Intuitive onboarding flow
- Real-time processing feedback
- Offline capability support

### 🌐 Marketplace Integration Ready
- Multi-platform export capabilities
- SEO-optimized descriptions
- Professional image formats
- Marketplace-specific formatting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase account
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd kalakar-app

# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install Firebase Functions dependencies
cd functions && npm install && cd ..
```

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env.local
```

2. Fill in your configuration in `.env.local`:
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
```

3. Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

### Development

```bash
# Start frontend development server
npm run dev

# Start backend server (in another terminal)
cd backend
npm start
```

Visit `http://localhost:5173` to see the app in action!

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Firebase      │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│   (Auth/DB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface│    │   AI Processing │    │   Data Storage  │
│   - Voice Input │    │   - Gemini API  │    │   - Firestore   │
│   - Image Upload│    │   - Image AI    │    │   - Storage     │
│   - Chat UI     │    │   - NLP         │    │   - Functions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons

### Backend
- **Express.js** - Web application framework
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **Node-fetch** - HTTP client

### AI & Services
- **Google Gemini 2.5 Flash** - Advanced AI model
- **Firebase Auth** - User authentication
- **Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Firebase Functions** - Serverless functions

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Firebase CLI** - Deployment tools

## 📁 Project Structure

```
kalakar-app/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/          # API services
│   ├── types.ts           # TypeScript definitions
│   └── App.tsx            # Main app component
├── backend/               # Backend server
│   ├── server.js          # Express server
│   ├── uploads/           # Temporary file storage
│   └── package.json       # Backend dependencies
├── functions/             # Firebase Functions
│   ├── src/               # Functions source code
│   └── package.json       # Functions dependencies
├── public/                # Static assets
├── dist/                  # Build output
└── HOSTING_GUIDE.md       # Deployment guide
```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication, Firestore, and Storage
3. Download configuration and update `.env.local`

### Gemini API Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to your environment variables

### Security Rules
Update Firestore and Storage rules for production use. See `HOSTING_GUIDE.md` for details.

## 🚀 Deployment

For complete deployment instructions, see [HOSTING_GUIDE.md](./HOSTING_GUIDE.md).

### Quick Deploy Options

**Frontend:**
- Firebase Hosting: `firebase deploy --only hosting`
- Vercel: `vercel`
- Netlify: Drag `dist` folder to Netlify Drop

**Backend:**
- Railway: Connect GitHub repo
- Render: Deploy from GitHub
- Google Cloud Run: Use Docker

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd backend && npm test

# Run Firebase Functions tests
cd functions && npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 API Documentation

### Backend Endpoints

- `POST /process-conversation` - Process voice conversation
- `POST /process-images` - AI image enhancement
- `POST /generate-description` - Generate product descriptions
- `GET /health` - Health check

### Frontend Services

- `universalSpeechRecognition.ts` - Speech-to-text service
- `backendApi.ts` - Backend API client
- `api.ts` - Firebase API wrapper

## 🔒 Security

- Environment variables for sensitive data
- Firebase Security Rules
- CORS configuration
- Input validation and sanitization
- Rate limiting on API endpoints

## 📊 Performance

- Lazy loading of components
- Image optimization
- Efficient state management
- Minimal bundle size
- CDN delivery

## 🌍 Internationalization

The app supports multiple languages and cultural contexts:
- English (default)
- Spanish
- French
- Hindi
- More languages can be added easily

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Mobile-optimized voice input
- Progressive Web App (PWA) ready

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced marketplace integrations
- [ ] Multi-language voice support
- [ ] Batch processing capabilities
- [ ] Analytics dashboard
- [ ] Community features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI team for the powerful AI capabilities
- Firebase team for the excellent backend services
- The open-source community for amazing tools and libraries
- Artisans worldwide who inspire this project

## 📞 Support

- 📧 Email: support@kalakar.app
- 💬 Discord: [Join our community](https://discord.gg/kalakar)
- 📖 Documentation: [docs.kalakar.app](https://docs.kalakar.app)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/kalakar-app/issues)

---

**Made with ❤️ for artisans worldwide**