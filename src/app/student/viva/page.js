"use client";

import React, { useState } from 'react';
import { ai } from '@/lib/gemini';
import { Mic, Send, RefreshCw, Bot, User, CheckCircle2, Sparkles, Award } from 'lucide-react';

export default function AIVivaSimulator() {
  const [subject, setSubject] = useState('Computer Science');
  const [vivaActive, setVivaActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dialog History
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Welcome to the AI Oral Viva Board. I will evaluate your knowledge in your chosen subject. When you are ready, click "Start Viva Board"!' }
  ]);
  const [inputValue, setInputValue] = useState('');

  // Scores card
  const [currentQuestion, setCurrentQuestion] = useState('What is the main difference between stack and queue memory structures?');
  const [lastEvaluation, setLastEvaluation] = useState(null);

  const handleStartViva = () => {
    setVivaActive(true);
    let firstQ = 'What is the main difference between stack and queue memory structures?';
    if (subject === 'Information Technology') firstQ = 'Can you define the difference between deep learning and standard machine learning?';
    else if (subject === 'Physics') firstQ = "Explain Newton's second law of motion and provide a mathematical expression.";
    else if (subject === 'History') firstQ = 'Describe the fundamental triggers that ignited the French Revolution.';

    setCurrentQuestion(firstQ);
    setMessages([
      { role: 'ai', text: `Oral board initiated for **${subject}**.` },
      { role: 'ai', text: `First Question: **${firstQ}**` }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const studentAns = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Append student message
    const updatedMsgs = [...messages, { role: 'user', text: studentAns }];
    setMessages(updatedMsgs);

    try {
      // Clean previous messages for api payload
      const chatHistory = updatedMsgs.slice(-4).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await ai.evaluateVivaResponse(subject, currentQuestion, studentAns, chatHistory);
      
      // Update scorecard evaluation
      setLastEvaluation(response);

      // Append AI response and next question
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: `**Feedback:** ${response.feedback}\n\n**Actionable Improvement:** ${response.improvement}` },
        { role: 'ai', text: `**Follow-up Question:** ${response.nextQuestion}` }
      ]);
      setCurrentQuestion(response.nextQuestion);
    } catch (err) {
      alert(`Viva review failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-black text-white">AI Viva Simulator</h1>
        <p className="text-text-secondary text-sm">Test your conceptual depth and explain structures out loud in simulated oral exam sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Panel & Scoreboard */}
        <div className="space-y-6">
          {/* Controls */}
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-heading font-bold text-white border-b border-border-subtle pb-2">Viva Configuration</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Board Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                disabled={vivaActive}
                className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none disabled:opacity-50"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Artificial Intelligence</option>
                <option value="Physics">Physics</option>
                <option value="History">History</option>
              </select>
            </div>

            <button
              onClick={handleStartViva}
              disabled={vivaActive}
              className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl shadow-yellow-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
            >
              <Mic className="w-5 h-5" /> Start Viva Board
            </button>
          </div>

          {/* Realtime Diagnostics Scorecard */}
          {lastEvaluation && (
            <div className="glass-card p-6 border-brand-yellow glow-yellow space-y-6">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-1.5">
                <Award className="w-5 h-5 text-brand-yellow" /> Performance Diagnostics
              </h3>

              <div className="text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-text-secondary block">Response Score</span>
                <span className="text-4xl font-heading font-black text-brand-yellow mt-1">{lastEvaluation.score} <span className="text-lg text-text-secondary">/ 10</span></span>
              </div>

              {/* Metric Breakdown */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-text-secondary mb-1">
                    <span>Concept Accuracy</span>
                    <span className="text-white font-bold">{lastEvaluation.score >= 8 ? '90%' : lastEvaluation.score >= 6 ? '70%' : '50%'}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow rounded-full" style={{ width: lastEvaluation.score >= 8 ? '90%' : lastEvaluation.score >= 6 ? '70%' : '50%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-text-secondary mb-1">
                    <span>Completeness</span>
                    <span className="text-white font-bold">{lastEvaluation.score >= 7 ? '85%' : '60%'}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow rounded-full" style={{ width: lastEvaluation.score >= 7 ? '85%' : '60%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-text-secondary mb-1">
                    <span>Academic Terminology</span>
                    <span className="text-white font-bold">{lastEvaluation.score >= 9 ? '95%' : lastEvaluation.score >= 7 ? '75%' : '45%'}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow rounded-full" style={{ width: lastEvaluation.score >= 9 ? '95%' : lastEvaluation.score >= 7 ? '75%' : '45%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Dialogue Chat Panel */}
        <div className="lg:col-span-2 glass-card flex flex-col h-[520px] overflow-hidden">
          {/* Scrollable messages area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'ai';
              return (
                <div key={idx} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border text-xs font-bold ${
                    isAI ? 'bg-brand-yellow/10 border-brand-yellow/30 text-brand-yellow' : 'bg-white/5 border-white/10 text-white'
                  }`}>
                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isAI ? 'bg-bg-dark border border-border-subtle text-text-secondary whitespace-pre-line' : 'bg-brand-yellow text-bg-darkest font-semibold'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                <div className="w-8 h-8 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 flex items-center justify-center text-brand-yellow">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-bg-dark border border-border-subtle rounded-xl text-xs text-text-secondary">
                  Oral examiner evaluating your arguments...
                </div>
              </div>
            )}
          </div>

          {/* Dialogue Form inputs */}
          <form onSubmit={handleSendMessage} className="p-4 bg-bg-dark border-t border-border-subtle flex gap-2 shrink-0">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!vivaActive || loading}
              placeholder={vivaActive ? "Type your academic oral response..." : "Click Start Viva Board to begin."}
              className="flex-1 bg-bg-darkest border border-border-subtle focus:border-brand-yellow rounded-xl px-4 py-3 text-sm text-white focus:outline-none disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={!vivaActive || loading || !inputValue.trim()}
              className="px-5 py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
