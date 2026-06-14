"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ai } from '@/lib/gemini';
import { MessageSquare, X, Send, Bot, User, RefreshCw, Sparkles } from 'lucide-react';

export default function AiAssistant() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Check if examination is active
  const isExamActive = pathname?.includes('/student/exam/');

  // Load chat history and initial message on mount/user change
  useEffect(() => {
    if (!user || isExamActive) return;

    async function loadHistory() {
      try {
        const history = await db.getChatHistory(user.id);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Setup welcoming message if history is empty
          const welcomeMsg = user.role === 'teacher'
            ? { sender: 'ai', text: `Hello Professor **${user.name}**! I am your AI Faculty Co-Pilot. I am loaded with class performance data, student weak-topic trends, and exam telemetry. Ask me to generate questions, suggest study plans, explain performance trends, or recommend interventions.`, timestamp: new Date().toISOString() }
            : { sender: 'ai', text: `Hi **${user.name}**! I am your AI Learning Assistant. I can see your previous exam results, weak areas, and active study plan. Ask me to explain concepts, practice questions, or review your study schedule.`, timestamp: new Date().toISOString() };
          
          setMessages([welcomeMsg]);
          await db.saveChatHistory(user.id, user.role, [welcomeMsg]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadHistory();
  }, [user, isExamActive]);

  // Listen for question explanation requests from incorrect question review list
  useEffect(() => {
    if (!user || isExamActive) return;

    const handleExplainQuestion = async (event) => {
      const { question, studentAnswer, correctAnswer, subject, examTitle } = event.detail;
      
      // Open assistant panel
      setIsOpen(true);
      setLoading(true);

      const promptText = `Please explain why my answer to this question on the exam "${examTitle}" (${subject}) is incorrect:
      
Question: "${question}"
My Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"`;

      // Append user message
      const userMsg = {
        sender: 'user',
        text: promptText,
        timestamp: new Date().toISOString()
      };

      let currentMsgs = [];
      setMessages(prev => {
        const next = [...prev, userMsg];
        currentMsgs = next;
        db.saveChatHistory(user.id, user.role, next).catch(err => console.error(err));
        return next;
      });

      try {
        // Build custom system instruction for personal explanation
        const systemInstruction = `You are a friendly, encouraging academic tutor. The student has requested an explanation for an incorrect answer in their exam. 
        You MUST provide a structured, encouraging explanation containing:
        1. Explaining why the answer is incorrect.
        2. Explaining the correct concept.
        3. Providing a simple, easy-to-understand real-world analogy or code example.
        4. Suggesting a practical tip to avoid this mistake in future exams.
        
        Keep your tone supportive and academic. Use markdown formatting to highlight sections.`;

        // Convert chat history format for Gemini call
        const apiHistory = currentMsgs.slice(-5).map(m => ({
          role: m.sender === 'user' ? 'user' : 'ai',
          text: m.text
        }));

        const aiReply = await ai.callGemini(systemInstruction, promptText, false);
        
        const aiMsg = {
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => {
          const next = [...prev, aiMsg];
          db.saveChatHistory(user.id, user.role, next).catch(err => console.error(err));
          return next;
        });
      } catch (err) {
        console.error('Explanation generation failed:', err);
        const errorMsg = {
          sender: 'ai',
          text: `Failed to compile personalized AI explanation: ${err.message}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('examai-explain-question', handleExplainQuestion);
    return () => {
      window.removeEventListener('examai-explain-question', handleExplainQuestion);
    };
  }, [user, isExamActive, messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // If user is not authenticated or if they are in an active exam, do not render chatbot widget
  if (!user || isExamActive) {
    return null;
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;

    // Check again for active exam at point of send
    if (isExamActive) {
      alert("AI Assistant is disabled during examinations.");
      return;
    }

    const userMsg = {
      sender: 'user',
      text: inputVal.trim(),
      timestamp: new Date().toISOString()
    };

    setInputVal('');
    setLoading(true);

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    await db.saveChatHistory(user.id, user.role, updatedMsgs);

    try {
      // 1. Retrieve dynamic profile context (context-aware responses)
      let contextStr = '';
      if (user.role === 'student') {
        const results = await db.getResults();
        const studentResults = results.filter(r => r.studentId === user.id);
        const studyPlan = await db.getStudyPlan(user.id);
        
        const previousResultsText = studentResults.map(r => 
          `- Exam: ${r.examTitle}, Score: ${r.score}/${r.totalMarks} (${r.percentage}%), Passed: ${r.passed}, Weak Area: ${r.weakArea || 'None'}, Date: ${r.timestamp}`
        ).join('\n');
        
        const weakTopics = studentResults.map(r => r.weakArea).filter(Boolean);
        const uniqueWeakTopics = Array.from(new Set(weakTopics));
        
        const studyPlanText = studyPlan ? `
Weekly Tasks: ${studyPlan.weeklySchedule?.map(t => `${t.day}: ${t.task} (${t.duration}m) [Done: ${t.done}]`).join(', ')}
Advisor Recommendations: ${studyPlan.recommendations?.join('; ')}
` : 'None configured yet.';

        contextStr = `Student Name: ${user.name}
Previous Exam Results:
${previousResultsText || 'None recorded yet.'}

Weak Topics Identified:
${uniqueWeakTopics.join(', ') || 'None recorded yet.'}

Current Study Plan:
${studyPlanText}`;
      } else if (user.role === 'teacher') {
        const results = await db.getResults();
        const exams = await db.getExams();
        const proctorLogs = await db.getProctoringLogs();
        const activeSessions = await db.getActiveSessions();

        const totalExamsCount = exams.length;
        const totalResultsCount = results.length;
        
        const averageScore = totalResultsCount > 0 
          ? (results.reduce((sum, r) => sum + r.score, 0) / results.reduce((sum, r) => sum + r.totalMarks, 0) * 100).toFixed(1)
          : 'N/A';

        const weakTopics = results.map(r => r.weakArea).filter(Boolean);
        const weakTopicCounts = {};
        weakTopics.forEach(t => { weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1; });
        const sortedWeakTopics = Object.entries(weakTopicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(e => `${e[0]} (${e[1]} occurrences)`)
          .join(', ');

        const totalViolations = proctorLogs.length;
        const highRiskCount = activeSessions.filter(s => s.integrityScore < 60).length;

        contextStr = `Teacher Name: ${user.name}
Overall Class Performance and Telemetry:
- Total Exams Generated/Scheduled: ${totalExamsCount}
- Total Submissions Evaluated: ${totalResultsCount}
- Average Student Performance Score: ${averageScore}%
- Top Student Weak Area Trends: ${sortedWeakTopics || 'None identified yet.'}
- Total Proctor Violations Logged: ${totalViolations}
- Candidates currently flagged High Risk: ${highRiskCount}`;
      }

      // Convert chat history format for Gemini call
      const apiHistory = updatedMsgs.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'ai',
        text: m.text
      }));

      // Call Gemini integration
      const aiReply = await ai.getChatResponse(user.role, contextStr, userMsg.text, apiHistory);
      
      const aiMsg = {
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toISOString()
      };

      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      await db.saveChatHistory(user.id, user.role, finalMsgs);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        sender: 'ai',
        text: `Error calling AI Assistant: ${err.message || 'Verification of live credentials failed.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 1. Chat Window Panel */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] glass-card flex flex-col overflow-hidden mb-4 shadow-2xl animate-fade-in border border-border-subtle bg-bg-dark/95 backdrop-blur-md rounded-2xl">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border-subtle flex justify-between items-center bg-bg-dark shrink-0">
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-brand-yellow" />
              <span className="font-heading font-black text-xs text-white">
                {user.role === 'teacher' ? 'Faculty Co-Pilot' : 'AI Learning Assistant'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-text-secondary hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
            {messages.map((msg, idx) => {
              const isAI = msg.sender === 'ai';
              return (
                <div key={idx} className={`flex gap-2.5 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border text-3xs font-bold ${
                    isAI ? 'bg-brand-yellow/10 border-brand-yellow/30 text-brand-yellow' : 'bg-white/5 border-white/10 text-white'
                  }`}>
                    {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isAI ? 'bg-bg-dark border border-border-subtle text-text-secondary whitespace-pre-line' : 'bg-brand-yellow text-bg-darkest font-bold'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-2.5 max-w-[80%] mr-auto items-center">
                <div className="w-7 h-7 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 flex items-center justify-center text-brand-yellow">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-2.5 bg-bg-dark border border-border-subtle rounded-xl text-3xs text-text-secondary">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-bg-dark border-t border-border-subtle flex gap-2 shrink-0">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={loading}
              placeholder={`Ask the assistant...`}
              className="flex-1 bg-bg-darkest border border-border-subtle focus:border-brand-yellow rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-black rounded-xl text-3xs hover:opacity-90 shadow-yellow-glow disabled:opacity-50 flex items-center justify-center transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* 2. Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest flex items-center justify-center cursor-pointer shadow-yellow-glow hover:shadow-yellow-glow-lg transition-all hover:scale-105 active:scale-95 border border-white/10"
        title={user.role === 'teacher' ? 'Faculty Assistant' : 'Learning Assistant'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </div>
  );
}
