# Kalakar

Kalakar is a React-based web application built to help artisans turn their physical crafts into digital marketplace listings. It replaces manual data entry forms with an AI-driven conversational interface that asks artisans about their products, processes uploaded photos, and generates formatted listings for different platforms.

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Important Code Concepts](#important-code-concepts)
- [Architectural Decisions](#architectural-decisions)
- [Data Model](#data-model)
- [Main User Flows](#main-user-flows)
- [Setup Instructions](#setup-instructions)
- [Available Scripts](#available-scripts)
- [Configuration Notes](#configuration-notes)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Learning Outcomes](#learning-outcomes)
- [Screenshots](#screenshots)
- [License](#license)

## About the Project

The project addresses the friction artisans face when digitizing handmade goods. Instead of requiring users to fill out complex forms for different platforms, the app allows them to speak naturally about what they created. The application uses a conversational flow to extract materials, cultural context, and pricing. It also handles photo uploads and generates targeted product descriptions for platforms like Etsy, Amazon, and WhatsApp Business.

The current implementation focuses on the core artisan workflow—from voice intake to listing review. The application mostly relies on local React state to handle routing between stages, while leveraging Firebase functions and a local Express server to handle speech processing, AI generation, and image enhancement.

## Key Features

- **Conversational Intake**
  A voice-first interface that interviews the artisan about their product to extract structured information like materials, dimensions, and cultural significance.
- **Photo Enhancement**
  A local backend flow designed to process and improve uploaded product photos before generating the listing.
- **Listing Generation & Review**
  The app uses the extracted conversational data to generate customized product titles, descriptions, tags, and artisan bios tailored to specific marketplaces.
- **Marketplace Export Workflows**
  Workflows representing the export of the reviewed listing to Etsy, Amazon, and WhatsApp Business, managed via backend function calls.
- **Content Booster**
  A dedicated screen (`ContentBooster.tsx`) that generates social media posts, short ads, and story snippets based on the artisan's overall profile and craft story.
- **AI Assistant**
  A chat interface (`AIAssistantScreen.tsx`) where artisans can ask questions about pricing strategies, marketplace optimization, and photography tips.

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React / Vite / TypeScript | Handles the user interface, client-side routing, and component state. |
| Styling | Tailwind CSS | Provides utility classes for styling the application screens. |
| Backend Services | Firebase Functions / Express | Handles heavy tasks like AI text generation, speech recognition, and image processing. |
| State | React State (useState) | Manages the current screen and application state directly in `App.tsx`. |
| Database | Firebase Firestore | Provides the schema for user profiles, conversation history, and saved listings. |
| Testing | Jest | Runs automated test suites for components and API services. |

## System Architecture

The application separates the UI from the processing logic. The React frontend interacts with an abstraction layer (`api.ts`), which routes requests either to Firebase Functions (for AI and speech) or to a local Express server (for photo processing).

```txt
User (Artisan)
  ↓
React Screens (App.tsx -> Dashboard / ReviewScreen)
  ↓
Services Layer (src/services/api.ts)
  ↓
Firebase Functions (Speech, Export) / Local Express Backend (Image Processing)
  ↓
Firestore Database
```

## Folder Structure

```txt
src/
  __tests__/       Jest test files for components and integration logic
  components/      React components mapping to specific application screens and UI elements
  hooks/           Custom hooks (e.g., useAudioRecording) for managing side effects
  services/        API abstraction layer containing Firebase and local server calls
  types/           TypeScript interfaces describing the application's domain models
  App.tsx          The main component that handles client-side routing via state
backend/           A local Express server handling tasks like photo improvement
functions/         Firebase Functions handling AI integrations and external marketplace logic
```

## Important Code Concepts

- **State-Driven Client Routing:**
  Instead of a library like React Router, the application uses a central state object in `App.tsx` containing `currentScreen`. This forces a linear progression through the onboarding, recording, photo upload, and listing generation steps.
- **Service Abstraction Layer:**
  The `src/services/api.ts` file acts as a boundary between the UI and the backend. Components call functions like `processUserSpeech` without needing to know whether the request goes to Firebase or a local server.
- **Conversation State Tracking:**
  Interfaces in `types.ts` like `ConversationData` track the progress of the AI interview, storing individual turns, extracted product info, and the current conversation stage.

## Architectural Decisions

- **Local State for Workflow Routing:**
  Using a simple state machine in `App.tsx` for routing is a practical choice at this prototype stage. It ensures that the complex, multi-step listing generation flow happens in a strict sequence before full URL-based routing is necessary.
- **Firebase Functions for AI Processing:**
  The structure relies on Firebase Functions to handle the AI interactions and speech recognition. This makes sense because it offloads computationally heavy and secret-key-dependent operations from the client.
- **Local Express Backend for Images:**
  An Express server (`backend/`) is used to process photos locally. This suggests a development tradeoff where computationally expensive or file-system heavy image tasks were kept local during initial development before migrating to a cloud environment.

## Data Model

- **UserProfile:** Tracks basic artisan information like name, location, and a unique identifier.
- **ConversationData:** Represents an ongoing or completed AI interview session. It holds an array of `ConversationTurn` objects, the extracted `ProductInfo`, and the session status.
- **ProductInfo:** The structured data extracted from the conversation, containing fields for materials, dimensions, colors, and cultural significance.
- **ProductListing:** The generated output ready for export, containing the title, description, features, tags, and artisan bio.
- **UploadedPhoto:** Tracks the images uploaded by the user, storing both the original file reference and an improved base64 data URL if it was enhanced.

## Main User Flows

- **Product Digitization Flow:**
  1. The user clicks "Create New Listing" on the `Dashboard`.
  2. The app guides them to `VoiceRecording` to capture raw audio input about their product.
  3. The `SimpleConversationInterface` extracts specific product details based on the audio.
  4. The user uploads images via `PhotoUpload`, which attempts to enhance the photos through the local backend.
  5. The AI generates variations of the listing in `ReviewScreen` tailored for Etsy, Amazon, and WhatsApp.
  6. The user selects a platform to trigger an export simulation.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended based on Firebase functions config)
- npm (based on the presence of `package-lock.json`)
- A Firebase project if you intend to run the cloud functions locally

### Installation
```bash
git clone <repository-url>
cd <repository-folder>
npm run setup
```
The `setup` script will install dependencies for the root frontend, the `backend` folder, and the `functions` folder.

### Environment Variables
Create a `.env.local` file in the root based on `.env.example`:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GEMINI_API_KEY=
```

### Running Locally
To run the frontend:
```bash
npm run dev
```

To run the local Express server (needed for photo improvement):
```bash
npm run backend:dev
```

To run the Firebase Functions emulator:
```bash
npm run functions:dev
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Builds the React frontend for production |
| `npm run test` | Runs the Jest test suite |
| `npm run backend:dev` | Starts the local Express backend with nodemon |
| `npm run functions:dev` | Compiles and starts the Firebase Functions emulator |
| `npm run deploy:all` | Builds and deploys the frontend and functions to Firebase |
| `npm run setup` | Installs dependencies across the main project, backend, and functions folders |

## Configuration Notes

- **vite.config.ts**: Configures the Vite build system and the React plugin.
- **firebase.json**: Defines the deployment targets for Firebase Hosting, Firestore rules, and the local emulator ports.
- **tailwind.config.js**: Sets up the Tailwind CSS theme variables, defining custom colors (like `etsy`, `amazon`, and `whatsapp`) and spacing constants used throughout the UI.
- **tsconfig.json**: Provides the TypeScript configuration, including DOM type libraries and Vite client types.

## Testing

The project uses Jest and React Testing Library. Tests are located in the `src/__tests__` directory and cover isolated UI components like the Chatbot, as well as logic for the conversation flow.
You can run the tests using:
```bash
npm run test
```

## Deployment

The repository is configured to deploy directly to Firebase. The hosting rules in `firebase.json` specify that the build output should be served, and all traffic is rewritten to `index.html` to support the single-page application.
The command `npm run deploy:all` handles building the React app and deploying the public assets alongside the backend functions to a connected Firebase project.

## Future Improvements

- **Database Synchronization:** While the app has Firebase configured, relying less on local React state for routing and moving more session state into Firestore would allow users to resume workflows across different devices.
- **Authentication:** Adding a proper Firebase Auth login flow to secure artisan profiles and their historical generated listings.
- **URL Routing:** Replacing the `currentScreen` state machine with React Router to allow direct linking to specific pages and better browser history management.
- **Error Boundaries:** Adding more specific error handling during AI generation and network failures, so users can retry a specific failed step instead of losing context.
- **Production Image Backend:** Moving the local Express image processing logic into a scalable cloud service or integrating it directly into Firebase Functions.

## Learning Outcomes

This project demonstrates how to structure a complex, multi-step application that relies heavily on asynchronous AI workflows. It highlights practical software engineering decisions, such as maintaining a clear service abstraction layer, using TypeScript to strictly type domain models, and orchestrating a frontend that must handle variable response times from speech recognition and language models.

## Screenshots

Screenshots can be added here to show the main dashboards, workflows, and role-specific views.

## License

The repository includes a LICENSE file outlining the project's distribution and usage terms.
