/**
 * ExamAI Database & Authentication Service
 * Dual-mode backend mapping queries to Firebase or LocalStorage / In-Memory server fallback.
 */

// Initial Seed Data for fallback
const SEED_DATA = {
  users: [
    { id: 'usr-student', email: 'student@examai.com', password: 'password', name: 'Alex Johnson', role: 'student' },
    { id: 'usr-teacher', email: 'teacher@examai.com', password: 'password', name: 'Dr. Sarah Jenkins', role: 'teacher' },
    { id: 'usr-admin', email: 'admin@examai.com', password: 'password', name: 'Admin Master', role: 'admin' }
  ],
  exams: [
    {
      id: 'ex-js-basics',
      title: 'JavaScript Fundamentals & ES6+',
      subject: 'Computer Science',
      difficulty: 'medium',
      questionsCount: 5,
      totalMarks: 50,
      duration: 20,
      scheduledDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      createdByName: 'Dr. Sarah Jenkins',
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          text: 'Which of the following is NOT a valid JavaScript declaration statement?',
          options: ['var x = 10;', 'let x = 10;', 'const x = 10;', 'define x = 10;'],
          answer: 'define x = 10;',
          marks: 10
        },
        {
          id: 'q2',
          type: 'mcq',
          text: 'What is the output of console.log(typeof null) in JavaScript?',
          options: ['"null"', '"undefined"', '"object"', '"number"'],
          answer: '"object"',
          marks: 10
        },
        {
          id: 'q3',
          type: 'mcq',
          text: 'Which array method returns a new array with all elements that pass a test?',
          options: ['find()', 'filter()', 'map()', 'forEach()'],
          answer: 'filter()',
          marks: 10
        },
        {
          id: 'q4',
          type: 'short',
          text: 'Explain the difference between double equals (==) and triple equals (===) operators in JavaScript.',
          marks: 10
        },
        {
          id: 'q5',
          type: 'long',
          text: 'Describe what a JavaScript Promise is, explaining its three states, how chaining works, and provide a quick code snippet demonstrating a Promise construction.',
          marks: 10
        }
      ]
    },
    {
      id: 'ex-ai-intro',
      title: 'Introduction to Artificial Intelligence',
      subject: 'Information Technology',
      difficulty: 'hard',
      questionsCount: 4,
      totalMarks: 40,
      duration: 30,
      scheduledDate: new Date(Date.now() - 7200000).toISOString(), // Started 2 hours ago
      createdByName: 'Dr. Sarah Jenkins',
      questions: [
        {
          id: 'ai-q1',
          type: 'mcq',
          text: 'Which AI subfield focuses on creating systems that learn and adapt based on empirical observations?',
          options: ['Expert Systems', 'Natural Language Processing', 'Machine Learning', 'Robotics'],
          answer: 'Machine Learning',
          marks: 10
        },
        {
          id: 'ai-q2',
          type: 'mcq',
          text: 'What is the primary function of an activation function in a neural network?',
          options: ['Normalize inputs', 'Introduce non-linearity', 'Adjust learning rate', 'Calculate gradients'],
          answer: 'Introduce non-linearity',
          marks: 10
        },
        {
          id: 'ai-q3',
          type: 'short',
          text: 'Briefly define the term "Overfitting" in machine learning and how it can be mitigated.',
          marks: 10
        },
        {
          id: 'ai-q4',
          type: 'long',
          text: 'Compare and contrast supervised learning, unsupervised learning, and reinforcement learning. Provide one real-world application example for each type.',
          marks: 10
        }
      ]
    }
  ],
  results: [
    {
      id: 'res-js-alex',
      examId: 'ex-js-basics',
      examTitle: 'JavaScript Fundamentals & ES6+',
      studentId: 'usr-student',
      studentName: 'Alex Johnson',
      subject: 'Computer Science',
      score: 42,
      totalMarks: 50,
      percentage: 84,
      passed: true,
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
      responses: {
        'q1': 'define x = 10;',
        'q2': '"object"',
        'q3': 'filter()',
        'q4': '== performs type coercion before comparing, meaning "5" == 5 is true. === checks both value and type without coercion, meaning "5" === 5 is false.',
        'q5': 'A Promise represents an asynchronous operation. Its three states are Pending, Fulfilled, and Rejected. We chain them using .then() and .catch(). Example: new Promise((resolve) => setTimeout(resolve, 1000));'
      },
      topicBreakdown: [
        { topic: 'Syntax & Declarations', score: 10, total: 10 },
        { topic: 'Type Comparisons', score: 10, total: 10 },
        { topic: 'Array Operations', score: 10, total: 10 },
        { topic: 'Operators & Coercion', score: 7, total: 10 },
        { topic: 'Asynchronous Programming', score: 5, total: 10 }
      ],
      weakArea: 'Asynchronous Programming (Promises detail)',
      feedbacks: 'Great analytical capability on basic syntax, but needs focus on asynchronous promise implementations.'
    }
  ],
  proctoringLogs: [
    {
      id: 'pr-log-1',
      studentName: 'Alex Johnson',
      examTitle: 'JavaScript Fundamentals & ES6+',
      type: 'Tab Blur',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      details: 'Lost window focus / switched tabs during exam.'
    }
  ],
  studyPlans: [
    {
      studentId: 'usr-student',
      weeklySchedule: [
        { day: 'Monday', task: 'Revise JS Promise syntax, async/await handlers', duration: 60, done: true },
        { day: 'Tuesday', task: 'Practice coding questions on Array.prototype.reduce', duration: 45, done: true },
        { day: 'Wednesday', task: 'Review Machine Learning Supervised Algorithms', duration: 90, done: false },
        { day: 'Thursday', task: 'AI Viva Simulator practice (2 sessions)', duration: 40, done: false },
        { day: 'Friday', task: 'Mock Test on AI activation functions & gradient descent', duration: 60, done: false }
      ],
      recommendations: [
        'Review asynchronous handlers and promises in Javascript.',
        'Study mathematical formulas behind gradient descent algorithms.',
        'Practice describing reinforcement learning applications out loud for upcoming oral viva.'
      ]
    }
  ],
  activeSessions: [
    { studentId: 'usr-demo-1', studentName: 'Sarah Jenkins (Mock)', examId: 'ex-js-basics', integrityScore: 95, finalRiskAssessment: 'Low', totalViolations: 0, latestFrame: '', lastUpdated: new Date().toISOString() },
    { studentId: 'usr-demo-2', studentName: 'Michael Chang (Mock)', examId: 'ex-js-basics', integrityScore: 75, finalRiskAssessment: 'Medium', totalViolations: 2, latestFrame: '', lastUpdated: new Date().toISOString() },
    { studentId: 'usr-demo-3', studentName: 'Emma Watson (Mock)', examId: 'ex-js-basics', integrityScore: 40, finalRiskAssessment: 'High', totalViolations: 5, latestFrame: '', lastUpdated: new Date().toISOString() }
  ]
};

const LS_KEYS = {
  USERS: 'examai_db_users',
  EXAMS: 'examai_db_exams',
  RESULTS: 'examai_db_results',
  PROCTOR_LOGS: 'examai_db_proctor_logs',
  STUDY_PLANS: 'examai_db_study_plans',
  ACTIVE_SESSIONS: 'examai_db_active_sessions',
  CHATS: 'examai_db_chats'
};

// In-Memory storage helper for SSR server environments
const IN_MEMORY_DB = { ...SEED_DATA };

class FirebaseDbService {
  constructor() {
    this.firebaseApp = null;
    this.auth = null;
    this.firestore = null;
    this.localStorageMode = true;
    this.isClient = typeof window !== 'undefined';
  }

  // Load configuration from local storage safely
  getConfigVal(key) {
    if (!this.isClient) return null;
    return localStorage.getItem(key);
  }

  async init() {
    if (!this.isClient) {
      this.localStorageMode = true;
      return;
    }

    const fbConfigStr = this.getConfigVal('examai_fb_config') || process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    let config = null;
    if (fbConfigStr) {
      try {
        config = JSON.parse(fbConfigStr);
      } catch (e) {
        config = null;
      }
    }

    if (config && config.apiKey) {
      try {
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getAuth } = await import('firebase/auth');
        const { getFirestore } = await import('firebase/firestore');

        this.firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
        this.auth = getAuth(this.firebaseApp);
        this.firestore = getFirestore(this.firebaseApp);
        this.localStorageMode = false;
        console.log('ExamAI: Firebase connected successfully.');
      } catch (err) {
        console.error('Failed to initialize live Firebase. Falling back to LocalStorage Mode.', err);
        this.initLocalStorage();
      }
    } else {
      this.initLocalStorage();
    }
  }

  initLocalStorage() {
    this.localStorageMode = true;
    if (!this.isClient) return;

    if (!localStorage.getItem(LS_KEYS.USERS)) {
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(SEED_DATA.users));
    }
    if (!localStorage.getItem(LS_KEYS.EXAMS)) {
      localStorage.setItem(LS_KEYS.EXAMS, JSON.stringify(SEED_DATA.exams));
    }
    if (!localStorage.getItem(LS_KEYS.RESULTS)) {
      localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(SEED_DATA.results));
    }
    if (!localStorage.getItem(LS_KEYS.PROCTOR_LOGS)) {
      localStorage.setItem(LS_KEYS.PROCTOR_LOGS, JSON.stringify(SEED_DATA.proctoringLogs));
    }
    if (!localStorage.getItem(LS_KEYS.STUDY_PLANS)) {
      localStorage.setItem(LS_KEYS.STUDY_PLANS, JSON.stringify(SEED_DATA.studyPlans));
    }
    if (!localStorage.getItem(LS_KEYS.ACTIVE_SESSIONS)) {
      localStorage.setItem(LS_KEYS.ACTIVE_SESSIONS, JSON.stringify(SEED_DATA.activeSessions));
    }
    if (!localStorage.getItem(LS_KEYS.CHATS)) {
      localStorage.setItem(LS_KEYS.CHATS, JSON.stringify({}));
    }
  }

  // Helpers to read/write fallback storage safely
  getLSItem(key, fallback) {
    if (!this.isClient) {
      return IN_MEMORY_DB[key] || fallback;
    }
    const val = localStorage.getItem(LS_KEYS[key.toUpperCase()]);
    return val ? JSON.parse(val) : fallback;
  }

  setLSItem(key, value) {
    if (!this.isClient) {
      IN_MEMORY_DB[key] = value;
      return;
    }
    localStorage.setItem(LS_KEYS[key.toUpperCase()], JSON.stringify(value));
  }

  // --- AUTH METHODS ---
  async createUser(email, password, displayName, role) {
    await this.init();
    if (!this.localStorageMode) {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');

      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(cred.user, { displayName });

      const userDoc = {
        uid: cred.user.uid,
        email,
        name: displayName,
        role,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(this.firestore, 'users', cred.user.uid), userDoc);
      return { id: cred.user.uid, email, name: displayName, role };
    } else {
      const users = this.getLSItem('users', SEED_DATA.users);
      if (users.find(u => u.email === email)) {
        throw new Error('User already exists with this email.');
      }

      const newUser = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        password,
        name: displayName,
        role
      };

      users.push(newUser);
      this.setLSItem('users', users);
      return { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
    }
  }

  async loginUser(email, password) {
    await this.init();
    if (!this.localStorageMode) {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');

      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      const userSnap = await getDoc(doc(this.firestore, 'users', cred.user.uid));

      if (!userSnap.exists()) {
        // Automatically create missing user document (profile recovery)
        let inferredRole = 'student';
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('teacher') || lowerEmail.includes('faculty')) {
          inferredRole = 'teacher';
        } else if (lowerEmail.includes('admin')) {
          inferredRole = 'admin';
        }

        const userDoc = {
          uid: cred.user.uid,
          email,
          name: cred.user.displayName || email.split('@')[0] || 'Recovered Profile',
          role: inferredRole,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(this.firestore, 'users', cred.user.uid), userDoc);
        return { id: cred.user.uid, email, name: userDoc.name, role: inferredRole };
      }
      const data = userSnap.data();
      return { id: cred.user.uid, email: data.email, name: data.name, role: data.role };
    } else {
      const users = this.getLSItem('users', SEED_DATA.users);
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Invalid email or password.');
      }
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }
  }

  // --- CHAT HISTORY METHODS ---
  async getChatHistory(userId) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, getDoc } = await import('firebase/firestore');
      const chatSnap = await getDoc(doc(this.firestore, 'chats', userId));
      if (chatSnap.exists()) {
        return chatSnap.data().messages || [];
      }
      return [];
    } else {
      const chats = this.getLSItem('chats', {});
      return chats[userId] || [];
    }
  }

  async saveChatHistory(userId, userRole, messages) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(this.firestore, 'chats', userId), {
        userId,
        userRole,
        messages,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } else {
      const chats = this.getLSItem('chats', {});
      chats[userId] = messages;
      this.setLSItem('chats', chats);
    }
  }

  // Helper to format ISO Date/Time into 12-hour format with AM/PM (e.g. YYYY-MM-DD 08:30 AM)
  formatDateTime12H(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12
    const formattedTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    
    return `${year}-${month}-${day} ${formattedTime}`;
  }

  // Parse Date + Time (HH:MM) + AM/PM into a standard UTC ISO string
  parse12HourDateTime(dateStr, timeStr, ampm) {
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr || '0', 10);
    
    if (ampm === 'PM' && hour < 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    
    const localIso = `${dateStr}T${formattedHour}:${formattedMinute}:00`;
    const dateObj = new Date(localIso);
    return dateObj.toISOString();
  }

  // Enrich exam data with publishAt, closeAt and computed status
  enrichExamDates(ex) {
    if (!ex) return null;
    const now = new Date();
    let publishAt = ex.publishAt;
    let closeAt = ex.closeAt;
    
    if (!publishAt) {
      publishAt = ex.scheduledDate || now.toISOString();
    }
    if (!closeAt) {
      const pubDate = new Date(publishAt);
      const dur = ex.duration || 30;
      closeAt = new Date(pubDate.getTime() + dur * 60000).toISOString();
    }
    
    const pubTime = new Date(publishAt).getTime();
    const closeTime = new Date(closeAt).getTime();
    const nowTime = now.getTime();
    
    let status = ex.status;
    if (nowTime < pubTime) {
      status = 'scheduled';
    } else if (nowTime >= pubTime && nowTime <= closeTime) {
      status = 'live';
    } else {
      status = 'closed';
    }
    
    return {
      ...ex,
      publishAt,
      closeAt,
      status
    };
  }

  // --- EXAM METHODS ---
  async getExams() {
    await this.init();
    let rawExams = [];
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'exams'));
      rawExams = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      rawExams = this.getLSItem('exams', SEED_DATA.exams);
    }
    return rawExams.map(ex => this.enrichExamDates(ex));
  }

  async getExam(id) {
    const exams = await this.getExams();
    return exams.find(ex => ex.id === id) || null;
  }

  async saveExam(examData) {
    await this.init();
    const enriched = this.enrichExamDates(examData);
    if (!this.localStorageMode) {
      const { collection, addDoc, doc, setDoc } = await import('firebase/firestore');
      if (enriched.id) {
        await setDoc(doc(this.firestore, 'exams', enriched.id), enriched);
        return enriched;
      } else {
        const docRef = await addDoc(collection(this.firestore, 'exams'), enriched);
        return { id: docRef.id, ...enriched };
      }
    } else {
      const exams = this.getLSItem('exams', SEED_DATA.exams);
      if (enriched.id) {
        const idx = exams.findIndex(ex => ex.id === enriched.id);
        if (idx !== -1) exams[idx] = enriched;
      } else {
        enriched.id = 'ex-' + Math.random().toString(36).substring(2, 9);
        exams.push(enriched);
      }
      this.setLSItem('exams', exams);
      return enriched;
    }
  }


  async deleteExam(examId) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(this.firestore, 'exams', examId));
    } else {
      const exams = this.getLSItem('exams', SEED_DATA.exams);
      const filtered = exams.filter(ex => ex.id !== examId);
      this.setLSItem('exams', filtered);
    }
  }

  // --- ATTEMPT/RESULT METHODS ---
  async getResults() {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'results'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      return this.getLSItem('results', SEED_DATA.results);
    }
  }

  async saveResult(resultData) {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(this.firestore, 'results'), resultData);
      return { id: docRef.id, ...resultData };
    } else {
      const results = this.getLSItem('results', SEED_DATA.results);
      resultData.id = 'res-' + Math.random().toString(36).substring(2, 9);
      results.push(resultData);
      this.setLSItem('results', results);
      return resultData;
    }
  }

  // --- PROCTOR LOGS ---
  async getProctoringLogs() {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'proctor_logs'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      return this.getLSItem('proctor_logs', SEED_DATA.proctoringLogs);
    }
  }

  async logMalpractice(logData) {
    await this.init();
    const entry = {
      id: 'pr-log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...logData
    };
    if (!this.localStorageMode) {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(this.firestore, 'proctor_logs'), entry);
    } else {
      const logs = this.getLSItem('proctor_logs', SEED_DATA.proctoringLogs);
      logs.push(entry);
      this.setLSItem('proctor_logs', logs);
    }
    return entry;
  }

  // --- STUDY PLAN METHODS ---
  async getStudyPlans() {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'study_plans'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      return this.getLSItem('study_plans', SEED_DATA.studyPlans);
    }
  }

  async getStudyPlan(studentId) {
    const plans = await this.getStudyPlans();
    return plans.find(p => p.studentId === studentId) || null;
  }

  async saveStudyPlan(studentId, planData) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(this.firestore, 'study_plans', studentId), { studentId, ...planData });
    } else {
      const plans = this.getLSItem('study_plans', SEED_DATA.studyPlans);
      const idx = plans.findIndex(p => p.studentId === studentId);
      const newPlan = { studentId, ...planData };
      if (idx !== -1) {
        plans[idx] = newPlan;
      } else {
        plans.push(newPlan);
      }
      this.setLSItem('study_plans', plans);
    }
  }

  // --- USER MANAGEMENT (ADMIN) ---
  async getUsers() {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'users'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      return this.getLSItem('users', SEED_DATA.users);
    }
  }

  async updateUserRole(userId, newRole) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(this.firestore, 'users', userId), { role: newRole });
    } else {
      const users = this.getLSItem('users', SEED_DATA.users);
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx].role = newRole;
        this.setLSItem('users', users);
      }
    }
  }

  async deleteUser(userId) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(this.firestore, 'users', userId));
    } else {
      const users = this.getLSItem('users', SEED_DATA.users);
      const filtered = users.filter(u => u.id !== userId);
      this.setLSItem('users', filtered);
    }
  }

  // --- ADVANCED PROCTORING RECORDING UPLOADS ---
  async uploadRecording(studentId, examId, videoBlob) {
    await this.init();
    try {
      const { getRecordingProvider } = await import('./recordingProvider');
      const provider = getRecordingProvider(this.localStorageMode ? null : this.firebaseApp);
      return await provider.upload(studentId, examId, videoBlob);
    } catch (err) {
      console.error('Storage upload failed, falling back to local Blob URL', err);
      return typeof window !== 'undefined' ? URL.createObjectURL(videoBlob) : '';
    }
  }

  // --- ACTIVE MONITORING SESSIONS ---
  async getActiveSessions() {
    await this.init();
    if (!this.localStorageMode) {
      const { collection, getDocs } = await import('firebase/firestore');
      const querySnap = await getDocs(collection(this.firestore, 'active_sessions'));
      return querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      return this.getLSItem('active_sessions', SEED_DATA.activeSessions || []);
    }
  }

  async updateActiveSession(studentId, sessionData) {
    await this.init();
    const entry = {
      studentId,
      lastUpdated: new Date().toISOString(),
      ...sessionData
    };
    if (!this.localStorageMode) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(this.firestore, 'active_sessions', studentId), entry, { merge: true });
    } else {
      const sessions = this.getLSItem('active_sessions', SEED_DATA.activeSessions || []);
      const idx = sessions.findIndex(s => s.studentId === studentId);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], ...entry };
      } else {
        sessions.push(entry);
      }
      this.setLSItem('active_sessions', sessions);
    }
    return entry;
  }

  async deleteActiveSession(studentId) {
    await this.init();
    if (!this.localStorageMode) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(this.firestore, 'active_sessions', studentId));
    } else {
      const sessions = this.getLSItem('active_sessions', SEED_DATA.activeSessions || []);
      const filtered = sessions.filter(s => s.studentId !== studentId);
      this.setLSItem('active_sessions', filtered);
    }
  }

  async forceTerminateSession(studentId, reason) {
    await this.updateActiveSession(studentId, { forceTerminated: true, terminationReason: reason });
  }
}

export const db = new FirebaseDbService();
export default db;
