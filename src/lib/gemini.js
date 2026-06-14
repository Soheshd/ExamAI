/**
 * ExamAI Gemini AI Integration Service
 * Dual-mode AI coordinator (REST Client to Gemini 2.5 Flash / 1.5 Flash & offline simulator).
 */

class GeminiAiService {
  constructor() {
    this.modelName = 'gemini-2.5-flash'; // Stable production model name
  }

  // Get key from local storage or environment
  getApiKey() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('examai_gemini_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    }
    return process.env.GEMINI_API_KEY || '';
  }

  isActive() {
    return this.getApiKey().trim().length > 0;
  }

  // Live REST call to Gemini
  async callGemini(systemInstruction, userPrompt, jsonMode = false) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };

    if (jsonMode) {
      requestBody.generationConfig = {
        responseMimeType: 'application/json'
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned error (${response.status}): ${errText}`);
    }

    const resData = await response.json();
    try {
      const content = resData.candidates[0].content.parts[0].text;
      return jsonMode ? JSON.parse(content) : content;
    } catch (e) {
      console.error('Failed to parse Gemini response payload:', resData, e);
      throw new Error('Unexpected formatting in Gemini API response.');
    }
  }

  // 1. AI Exam Question Paper Generator
  async generateExamQuestions(subject, difficulty, numQuestions, marks, types = { mcq: true, short: true, long: true }) {
    if (this.isActive()) {
      const sysInstruction = `You are an expert academic professor. Generate a high-quality exam paper based on the requested subject. 
      You MUST return your answer in a strict JSON array matching the schema:
      [
        {
          "id": "string (unique question ID like gen-q-1, gen-q-2)",
          "type": "mcq" | "short" | "long",
          "text": "The question description text here...",
          "options": ["Option A", "Option B", "Option C", "Option D"], // Required ONLY if type is mcq, must contain 4 items. Otherwise omit.
          "answer": "Option B", // Required ONLY if type is mcq, must match one of the items in options exactly. Otherwise omit.
          "marks": number // Allocate marks logically to sum up to the target marks.
        }
      ]`;

      const prompt = `Generate an exam paper for the subject "${subject}".
      Difficulty: ${difficulty}
      Total questions count: ${numQuestions}
      Total marks target: ${marks}
      Allowed question types: MCQ: ${types.mcq}, Short Answer: ${types.short}, Long Answer: ${types.long}.
      Distribute the marks logically so that the sum of all question marks is exactly ${marks}. MCQs should be fewer marks (e.g. 5-10), Short answers moderate (10-15), and Long answers higher (15-20).`;

      try {
        return await this.callGemini(sysInstruction, prompt, true);
      } catch (err) {
        console.error('Live Gemini generateExamQuestions failed. Using offline fallback.', err);
        return this.offlineGenerateQuestions(subject, difficulty, numQuestions, marks, types);
      }
    } else {
      return this.offlineGenerateQuestions(subject, difficulty, numQuestions, marks, types);
    }
  }

  // 2. AI Viva Oral Evaluation
  async evaluateVivaResponse(subject, question, studentAnswer, chatHistory = []) {
    if (this.isActive()) {
      const sysInstruction = `You are an intelligent oral examiner. Evaluate the student's answer to the viva question on ${subject}.
      You must respond in a strict JSON object with this exact schema:
      {
        "score": number, // integer score from 0 to 10 evaluating the correctness, depth, and clarity of the answer.
        "feedback": "constructive feedback text here...",
        "improvement": "actionable recommendations to improve here...",
        "nextQuestion": "The next relevant viva question on this subject to ask the student..."
      }`;

      const historyStr = chatHistory.map(h => `${h.role === 'ai' ? 'Examiner' : 'Student'}: ${h.text}`).join('\n');

      const prompt = `Subject: ${subject}
      Examiner Question: ${question}
      Student Answer: "${studentAnswer}"
      
      Viva Chat History:
      ${historyStr}
      
      Grade the answer out of 10, provide clear feedback and improvements, and formulate a new challenging follow-up question.`;

      try {
        return await this.callGemini(sysInstruction, prompt, true);
      } catch (err) {
        console.error('Live Gemini evaluateVivaResponse failed. Using offline fallback.', err);
        return this.offlineEvaluateViva(subject, question, studentAnswer);
      }
    } else {
      return this.offlineEvaluateViva(subject, question, studentAnswer);
    }
  }

  // 3. AI Study Planner Generator
  async generateStudyPlan(subjectScores, weakAreas, upcomingExams = []) {
    if (this.isActive()) {
      const sysInstruction = `You are an expert AI academic advisor. Generate a personalized study plan.
      You must return your answer in a strict JSON object with this exact schema:
      {
        "weeklySchedule": [
          { "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday", "task": "specific action-oriented task description", "duration": number, "done": false }
        ],
        "recommendations": [
          "recommendation item 1",
          "recommendation item 2",
          "recommendation item 3"
        ]
      }`;

      const prompt = `Generate a study schedule based on the following student performance metrics:
      Subject Grades: ${JSON.stringify(subjectScores)}
      Identified Weak Topics: ${weakAreas.join(', ')}
      Upcoming Exams: ${JSON.stringify(upcomingExams)}
      
      Allocate 3-5 tasks throughout the week focused heavily on revising their weak topics and preparing for their upcoming exams.`;

      try {
        return await this.callGemini(sysInstruction, prompt, true);
      } catch (err) {
        console.error('Live Gemini generateStudyPlan failed. Using offline fallback.', err);
        return this.offlineGenerateStudyPlan(weakAreas, upcomingExams);
      }
    } else {
      return this.offlineGenerateStudyPlan(weakAreas, upcomingExams);
    }
  }

  // --- OFFLINE SIMULATION LOGIC ---
  offlineGenerateQuestions(subject, difficulty, count, marks, types) {
    const list = [];
    const activeTypes = [];
    if (types.mcq) activeTypes.push('mcq');
    if (types.short) activeTypes.push('short');
    if (types.long) activeTypes.push('long');

    if (activeTypes.length === 0) activeTypes.push('short');

    const baseMark = Math.floor(marks / count);
    let remainingMarks = marks - (baseMark * count);

    const keywords = subject.toLowerCase();
    let questionsPool = [
      { type: 'mcq', text: `In ${subject}, what is the primary component used for standard operations?`, options: ['Main Module', 'Secondary Buffer', 'Core Engine', 'Helper Thread'], answer: 'Core Engine' },
      { type: 'mcq', text: `Which of the following is considered a best practice when starting a project in ${subject}?`, options: ['Ignoring documentation', 'Modular component splitting', 'Hardcoding variables', 'Manual testing only'], answer: 'Modular component splitting' },
      { type: 'short', text: `Explain the fundamental principles governing ${subject} and how they apply in industry.` },
      { type: 'short', text: `Detail two common bottlenecks encountered in ${subject} workflows and how to resolve them.` },
      { type: 'long', text: `Provide a comprehensive analysis of modern developments in ${subject}. Detail the architectural challenges, performance optimization options, and draw a block design layout to support your thesis.` }
    ];

    if (keywords.includes('python') || keywords.includes('code') || keywords.includes('programming') || keywords.includes('javascript') || keywords.includes('computer')) {
      questionsPool = [
        { type: 'mcq', text: 'Which data structure in Python is mutable and ordered?', options: ['List', 'Tuple', 'Set', 'Dictionary'], answer: 'List' },
        { type: 'mcq', text: 'What is the correct syntax to create a generator in Python?', options: ['Using brackets []', 'Using list comprehension', 'Using yield keyword inside function', 'Using generator class'], answer: 'Using yield keyword inside function' },
        { type: 'short', text: 'What is the difference between list.append() and list.extend() in Python? Explain with a short example.' },
        { type: 'short', text: 'Describe how Python handles memory management, specifically mentioning the reference counter and garbage collector.' },
        { type: 'long', text: 'Write a comprehensive guide on decorators in Python. Explain how they wrap functions, how to pass arguments to decorators, and provide code demonstrating a rate-limiting decorator.' }
      ];
    } else if (keywords.includes('history') || keywords.includes('social')) {
      questionsPool = [
        { type: 'mcq', text: 'In which year did World War I begin?', options: ['1912', '1914', '1918', '1939'], answer: '1914' },
        { type: 'mcq', text: 'Who was the first President of the United States?', options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Abraham Lincoln'], answer: 'George Washington' },
        { type: 'short', text: 'Briefly describe the primary causes of the French Revolution.' },
        { type: 'short', text: 'Explain the historical significance of the Magna Carta signed in 1215.' },
        { type: 'long', text: 'Discuss the socioeconomic impacts of the Industrial Revolution in Europe. Detail the shift in demographics, labor unions emergence, and how it laid foundations for modern technological expansion.' }
      ];
    } else if (keywords.includes('physics') || keywords.includes('science')) {
      questionsPool = [
        { type: 'mcq', text: 'What is the value of the speed of light in a vacuum?', options: ['3 x 10^8 m/s', '1.5 x 10^8 m/s', '3 x 10^6 m/s', '9.8 m/s^2'], answer: '3 x 10^8 m/s' },
        { type: 'mcq', text: 'Which law states that for every action, there is an equal and opposite reaction?', options: ['Newton\'s First Law', 'Newton\'s Second Law', 'Newton\'s Third Law', 'Law of Gravitation'], answer: 'Newton\'s Third Law' },
        { type: 'short', text: 'Define the Heisenberg Uncertainty Principle in quantum mechanics.' },
        { type: 'short', text: 'Describe the difference between kinetic energy and potential energy with mechanical examples.' },
        { type: 'long', text: 'State Einstein\'s Special Theory of Relativity. Detail the core postulates (constancy of the speed of light, relativity principle), and discuss the consequences of time dilation and length contraction.' }
      ];
    }

    for (let i = 0; i < count; i++) {
      const targetType = activeTypes[i % activeTypes.length];
      let poolItem = questionsPool.find(q => q.type === targetType && !list.some(li => li.text === q.text));
      
      if (!poolItem) {
        poolItem = questionsPool.find(q => !list.some(li => li.text === q.text)) || questionsPool[0];
      }

      const question = { ...poolItem };
      question.id = `gen-q-${i + 1}`;
      question.marks = baseMark;
      
      if (remainingMarks > 0) {
        question.marks += 1;
        remainingMarks--;
      }

      list.push(question);
    }

    return list;
  }

  offlineEvaluateViva(subject, question, studentAnswer) {
    const cleanAnswer = studentAnswer.toLowerCase();
    let score = 5;
    let feedback = "An interesting attempt, but it lacks academic depth. You should include specific definitions, mechanisms, and vocabulary associated with the topic.";
    let improvement = "Read up on the core theory and try to mention structural keywords.";
    
    const matches = (keywords) => keywords.some(k => cleanAnswer.includes(k));

    if (cleanAnswer.trim().length === 0) {
      score = 0;
      feedback = "You didn't provide any answer. Please attempt the question to receive evaluation.";
      improvement = "Try writing anything you know about the subject.";
    } else if (matches(['promise', 'async', 'await', 'callback', 'resolve', 'reject', 'overfitting', 'regularization', 'dropout', 'newton', 'relativity', 'light', 'force', 'mutable', 'immutable'])) {
      score = 9;
      feedback = "Excellent! You have referenced the core concepts and explained the underlying mechanism clearly, showing strong conceptual grasp.";
      improvement = "To score a perfect 10, include a brief contextual application case study in your response.";
    } else if (matches(['code', 'function', 'class', 'object', 'variable', 'neural', 'learning', 'history', 'law', 'energy', 'list', 'tuple'])) {
      score = 7;
      feedback = "Good response. You understand the basic definition, but you could expand on how it functions under different constraints.";
      improvement = "Focus on detailing the chronological process or implementation steps.";
    }

    let nextQuestion = `Can you explain the main real-world application of this in ${subject}?`;
    if (subject.toLowerCase().includes('computer') || subject.toLowerCase().includes('java') || subject.toLowerCase().includes('python')) {
      nextQuestion = "How does this concept affect overall memory management and CPU execution complexity?";
    } else if (subject.toLowerCase().includes('ai') || subject.toLowerCase().includes('machine')) {
      nextQuestion = "What role does the learning rate play in this context, and what happens if it is set too high?";
    } else if (subject.toLowerCase().includes('physics') || subject.toLowerCase().includes('science')) {
      nextQuestion = "Can you describe a simple experiment that verifies this principle in a high-school laboratory?";
    }

    return { score, feedback, improvement, nextQuestion };
  }

  offlineGenerateStudyPlan(weakAreas, upcomingExams) {
    const weeklySchedule = [
      { day: 'Monday', task: `Revise fundamental structures for: ${weakAreas[0] || 'Core Subject Concepts'}`, duration: 60, done: false },
      { day: 'Wednesday', task: `Complete active recall quizzes on: ${weakAreas[1] || 'Intermediate Topics'}`, duration: 45, done: false },
      { day: 'Friday', task: `Simulate full-length examination prep exercises`, duration: 90, done: false },
      { day: 'Saturday', task: 'Review study planner cards and recap incorrect test queries', duration: 40, done: false }
    ];

    const recommendations = [
      `Spend 30 minutes on active recall tests specifically targeting ${weakAreas[0] || 'weak items'}.`,
      'Explain the topic you failed out loud to identify gaps in your verbal explanations.',
      upcomingExams.length > 0 
        ? `Focus preparation towards upcoming exam: ${upcomingExams[0]?.title || 'Subject Exam'}`
        : 'Prepare ahead for upcoming course syllabus benchmarks.'
    ];

    return { weeklySchedule, recommendations };
  }

  // 4. AI Chatbot responses
  async getChatResponse(userRole, contextStr, userMessage, chatHistory = []) {
    if (this.isActive()) {
      let sysInstruction = `You are the ExamAI Intelligent Chatbot Assistant. You are serving a user with the role of: ${userRole.toUpperCase()}.\n`;

      if (userRole === 'student') {
        sysInstruction += `Here is the student's academic profile and context:\n${contextStr}\n\nRules:\n1. Help them review, practice, explain topics, suggest study strategies, and understand concepts.\n2. DO NOT provide answers or help during an active examination.\n3. Be encouraging, precise, and educational. Keep responses concise and formatted in clean markdown.`;
      } else if (userRole === 'teacher') {
        sysInstruction += `Here is the teacher's class performance data and telemetry:\n${contextStr}\n\nRules:\n1. Assist the teacher in generating questions, creating personalized study plans, explaining weak topics, analyzing student reports, and recommending educational interventions.\n2. You can refer to real statistics from their context if asked about class health, average scores, weak topics, or proctor violations.\n3. Keep responses highly professional, data-driven, and structured in clean markdown.`;
      }

      const formattedHistory = chatHistory.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      const fullPrompt = `${formattedHistory}\nUser: ${userMessage}\nAssistant:`;

      try {
        return await this.callGemini(sysInstruction, fullPrompt, false);
      } catch (err) {
        console.error('Live Gemini getChatResponse failed. Using offline fallback.', err);
        return this.offlineChatResponse(userRole, userMessage);
      }
    } else {
      return this.offlineChatResponse(userRole, userMessage);
    }
  }

  offlineChatResponse(userRole, message) {
    const msg = message.toLowerCase();
    if (userRole === 'student') {
      if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
        return "Hello! I am your ExamAI Learning Assistant. I can help you revise concepts, review weak topics, or understand your study planner. What would you like to study today?";
      }
      if (msg.includes('result') || msg.includes('score') || msg.includes('grade')) {
        return "I can see your previous results in the 'Performance Analytics' tab. If you have a specific question about a question you got wrong or want to review a topic, feel free to ask!";
      }
      if (msg.includes('study') || msg.includes('plan') || msg.includes('schedule')) {
        return "Your Study Planner has personalized weekly tasks to help you improve. Let me know if you need me to explain any of the topics listed in your schedule!";
      }
      return "As your AI learning assistant, I'm here to help you study. Could you clarify what specific concept or topic you would like to explore or practice?";
    } else {
      if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
        return "Greetings, Faculty Member. I am the ExamAI Instructor Assistant. I can assist you with generating exam questions, creating study plans, explaining class-wide weak-topic trends, and recommending student interventions. How can I help you today?";
      }
      if (msg.includes('generate') || msg.includes('question') || msg.includes('exam')) {
        return "To generate questions, you can use the 'AI Generator' panel in the sidebar. I can also generate draft questions right here in the chat if you specify the subject and difficulty!";
      }
      if (msg.includes('proctor') || msg.includes('violation') || msg.includes('cheat') || msg.includes('integrity')) {
        return "I can see proctoring violations and integrity scores in your 'Active Exam Security Dashboard'. If you need recommendations on how to handle student risk levels, feel free to ask.";
      }
      return "I can help analyze class performance, draft study recommendations, or prepare exam material. Please let me know what specific telemetry or action you'd like me to perform.";
    }
  }
}

export const ai = new GeminiAiService();
export default ai;
