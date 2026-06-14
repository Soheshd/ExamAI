# 🎓 ExamAI: Next-Generation AI-Proctored Exam & Study Assistant

ExamAI is a premium, state-of-the-art Next.js web application designed to revolutionize online academic evaluation and student learning. It combines robust, AI-powered proctoring, dynamic exam scheduling, and automated evaluation with advanced Gemini tutoring tools—including an AI Viva (oral exam) Simulator, an AI Study Planner, and a personalized "Explain This to Me" incorrect question review workflow.

---

## 🚀 Tech Stack

ExamAI is built using a modern, scalable, and secure architecture:

- **Core Framework**: [Next.js (v16.2.9 - App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Styling & UI**: [Tailwind CSS (v4)](https://tailwindcss.com/) with a custom Dark Mode & Glassmorphic Design System (custom glows, pulsing warning borders, custom scrollbars)
- **Database & Authentication**: [Firebase (v12.14.0)](https://firebase.google.com/) - Auth, Firestore Database, and Cloud Storage
- **AI Integration**: [Google Gemini API](https://ai.google.dev/) (via `@google/generative-ai` SDK) powering:
  - **AI Question Generator** (Teacher Dashboard)
  - **AI Viva Simulator** (Voice & text-based student oral exam)
  - **AI Study Planner** (Custom schedule based on weak topics)
  - **Student AI Tutor** ("Explain This to Me" personalized report generator)
- **Data Visualization**: [Recharts (v3.8.1)](https://recharts.org/) for student and class-wide performance analytics
- **Document Generation**: [jsPDF (v4.2.1)](https://rawgit.com/MrRio/jsPDF/master/docs/index.html) for downloadable, styled PDF exam reports
- **Icons**: [Lucide React (v1.17.0)](https://lucide.dev/) for high-fidelity interactive iconography

---

## 🛠️ Installation & Getting Started

Follow these steps to run ExamAI locally in your development environment:

### 1. Clone & Install Dependencies
First, ensure you have Node.js installed. Navigate to the project root directory and run:
```bash
npm install
```

### 2. Set Up Environment Variables
Create a file named `.env.local` in the root of the project. Copy the template from `.env.example` and fill in your values:
```bash
# Gemini API Keys
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Web App Config Object (Stringified JSON)
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"your_key","authDomain":"your_domain","projectId":"your_project_id","storageBucket":"your_bucket","messagingSenderId":"your_sender_id","appId":"your_app_id"}

# Recording Provider Mode (Set to false to enforce IndexedDB local browser fallback)
NEXT_PUBLIC_FIREBASE_STORAGE_AVAILABLE=true
```

### 3. Run the Development Server
Launch the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 4. Build for Production
To compile and optimize the application for production deployment:
```bash
npm run build
npm run start
```

---

## 🏗️ Architecture Overview

The codebase is organized logically, following Next.js App Router guidelines and clean separation of concerns:

```
examai-next/
├── public/                 # Static assets and icons
├── src/
│   ├── app/                # Next.js pages & routing
│   │   ├── admin/          # Admin capabilities (if applicable)
│   │   ├── api/            # Serverless API endpoints
│   │   ├── auth/           # Login, Registration, and Password Reset screens
│   │   ├── student/        # Student Dashboard, Exam Engine, Analytics, Viva & Planner
│   │   ├── teacher/        # Teacher Dashboard, Exam Manager, Proctoring Monitors & AI Generator
│   │   ├── layout.js       # Global provider context wrapper
│   │   └── globals.css     # Tailwind CSS theme overrides, glassmorphic card configurations
│   ├── components/         # Shared reusable components (navbar, sidebar, modals)
│   ├── context/            # Auth and Exam React Context Providers
│   └── lib/                # Modular service integrations
│       ├── firebase.js     # Firebase connection & query interfaces
│       ├── gemini.js       # Gemini API communication schemas
│       ├── indexedDb.js    # IndexedDB local storage engine
│       └── recordingProvider.js # Recording abstraction (IndexedDB fallback / Firebase Storage)
└── .gitignore              # Multi-stage security exclude listings
```

### Key Subsystem Workflows

#### 1. Dual-Mode Session Recording (`RecordingProvider`)
To accommodate differing Cloud plans and network scenarios, the application abstracts video uploads through a factory function:
- **`FirebaseStorageProvider`**: Uploads captured webm files directly to `/recordings/{studentId}_{examId}.webm` on Firebase Storage.
- **`LocalStorageProvider`**: Encapsulates IndexedDB persistence to cache recordings locally within the student's browser if storage is unavailable.
- Teachers can download these proctoring recordings directly from their dashboard.

#### 2. Dynamic Exam Scheduling System
Each exam includes `publishAt` (publish date/time) and `closeAt` (close date/time) timestamps:
- **Scheduled**: Exam is locked. Students see "Scheduled" on their dashboards and cannot access the exam page.
- **Live**: Start button is active. Students can take the exam.
- **Closed**: Start button is disabled. Access is barred.
- **Auto-Submission**: If a student is currently taking an exam and the `closeAt` time is reached, the exam engine intercepts this and submits the attempt automatically to preserve data integrity.

#### 3. Proctored Exam Engine
The exam screen monitors student activity using multiple cues:
- **Device Checks**: Validates camera access.
- **Visual Proctoring**: Integrates webcam-based streaming, tracking face count/loss.
- **Window Focus Tracking**: Records warnings if the student switches tabs or minimizes the browser.
- **Fullscreen Lock**: Alerts the proctor if the student exits fullscreen mode.
- Violations are computed and updated inside Firestore in real time, determining the final integrity score.

#### 4. AI Viva Simulator & Study Planner
- **Viva Simulator**: Uses Gemini to conduct a conversational oral check, gauging deep understanding and scoring responses.
- **Study Planner**: Generates tailored timetables and study guides by cross-referencing weakest performance areas from past exams.

#### 5. "Explain This to Me" Incorrect Question Review
In the post-exam report, incorrect questions are highlighted in red (with correct answers highlighted in green):
- Students can click **"Explain This to Me"** on any incorrect answer.
- This action opens the Student AI Assistant, feeding the question, student's answer, correct answer, and exam subject to the Gemini API.
- Gemini returns structured guidance: explaining the mistake, clarifying the correct concept with a real-world example, and offering suggestions on how to improve.

---

## 📸 Screenshots Section

Here is a summary of the visual interfaces provided by ExamAI:

### 1. Teacher Dashboard
- **Schedule Management**: Separate lists for Scheduled, Live, and Closed exams.
- **Proctoring Center**: Live monitors containing list of attempts, integrity score graphs, violation counts, and session recording status.

```
+-------------------------------------------------------------------------+
| [Teacher Dashboard]                                                     |
| +-------------------+ +---------------------+ +----------------------+ |
| |  Scheduled Exams  | |     Live Exams      | |     Closed Exams     | |
| |  - Physics Quiz   | |  - Calculus Final   | |  - Chemistry Midterm | |
| +-------------------+ +---------------------+ +----------------------+ |
|                                                                         |
| [Proctoring Log]                                                        |
| Student: John Doe | Integrity Score: 85% | Violations: 2 | [Download] |
+-------------------------------------------------------------------------+
```

### 2. Student Exam Workspace
- **Dynamic Lockout Alert**: Renders warning modals if the camera loses track of the user or if they attempt tab switches.
- **Clean Focus Area**: Question blocks, navigation panel, and auto-submit timer.

### 3. Student Review Modal & AI Tutor
- **Incorrect Question Highlight**: Color-coded review panels.
- **Personalized Chat**: Sidebar panel showing instant Gemini tutor feedback.

---

## 🔒 Security & GitHub Submission Audit

Before committing or pushing the code to a public repository, verification checks have confirmed:

1. **Secret Leak Prevention**: All API keys, passwords, and service account tokens are excluded. `.env.local` is listed in `.gitignore` and is not tracked.
2. **Clean Assets**: Only standard project code and configs are saved. All temporary test logs (`test_cloud.mjs`, `test_bucket.mjs`, `*_result.txt`) are ignored.
3. **Template Setup**: `.env.example` is fully documented and populated with non-sensitive placeholder variables.
