"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ai } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Loader2, Save, Trash2, RotateCw, Edit, Check } from 'lucide-react';

export default function AIQuestionGenerator() {
  const router = useRouter();
  const { user } = useAuth();

  // Generator Inputs
  const [subject, setSubject] = useState('Computer Science');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [totalMarks, setTotalMarks] = useState(50);
  const [types, setTypes] = useState({ mcq: true, short: true, long: true });

  // State
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');

  // Save Dialog state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(30);

  // Scheduling States
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('08:00');
  const [publishAmpm, setPublishAmpm] = useState('AM');
  const [closeDate, setCloseDate] = useState('');
  const [closeTime, setCloseTime] = useState('05:00');
  const [closeAmpm, setCloseAmpm] = useState('PM');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setQuestions([]);
    
    try {
      const subjectQuery = topic ? `${subject} - ${topic}` : subject;
      const result = await ai.generateExamQuestions(subjectQuery, difficulty, numQuestions, totalMarks, types);
      setQuestions(result);
      // Auto populate default title
      setExamTitle(`${subject} ${topic ? `(${topic})` : ''} - ${difficulty.toUpperCase()} Test`);
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQuestion = async (idx) => {
    const q = questions[idx];
    const updated = [...questions];
    updated[idx] = { ...q, text: 'Regenerating question text...' };
    setQuestions(updated);

    try {
      // Prompt Gemini to generate a single question of same type and subject
      const singleQ = await ai.offlineGenerateQuestions(subject, difficulty, 1, q.marks, {
        mcq: q.type === 'mcq',
        short: q.type === 'short',
        long: q.type === 'long'
      });
      if (singleQ && singleQ.length > 0) {
        updated[idx] = { ...singleQ[0], id: q.id, marks: q.marks };
        setQuestions(updated);
      }
    } catch (err) {
      alert(`Failed to regenerate: ${err.message}`);
      updated[idx] = q; // revert
      setQuestions(updated);
    }
  };

  const handleDeleteQuestion = (idx) => {
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setEditText(questions[idx].text);
  };

  const saveEdit = (idx) => {
    const updated = [...questions];
    updated[idx].text = editText;
    setQuestions(updated);
    setEditingIndex(null);
  };

  const handlePublishExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim() || !publishDate || !publishTime || !closeDate || !closeTime) {
      alert('Please fill out all fields.');
      return;
    }

    const publishAt = db.parse12HourDateTime(publishDate, publishTime, publishAmpm);
    const closeAt = db.parse12HourDateTime(closeDate, closeTime, closeAmpm);

    if (new Date(closeAt) <= new Date(publishAt)) {
      alert('Close date/time must be strictly after publish date/time.');
      return;
    }

    const examData = {
      title: examTitle,
      subject: subject,
      questionsCount: questions.length,
      totalMarks: questions.reduce((acc, curr) => acc + curr.marks, 0),
      duration: parseInt(examDuration),
      publishAt: publishAt,
      closeAt: closeAt,
      scheduledDate: publishAt, // for backward compatibility
      createdByName: user.name,
      questions: questions
    };

    try {
      await db.saveExam(examData);
      setShowSaveModal(false);
      router.push('/teacher');
    } catch (err) {
      alert(`Failed to publish exam: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-black text-white">AI Question Paper Generator</h1>
        <p className="text-text-secondary text-sm">Input configuration details and Gemini AI will construct questions immediately.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Panel */}
        <div className="glass-card p-6 h-fit space-y-6">
          <h3 className="text-lg font-heading font-bold text-white border-b border-border-subtle pb-2">Exam Parameters</h3>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology (AI)</option>
                <option value="Physics">Physics</option>
                <option value="History">History</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Topic / Chapter (Optional)</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="DBMS Normalization" 
                className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Difficulty</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Questions</label>
                <input 
                  type="number" 
                  min={1} 
                  max={20}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Marks</label>
                <input 
                  type="number" 
                  min={5}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-secondary uppercase">Question Formats</label>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={types.mcq}
                    onChange={(e) => setTypes({ ...types, mcq: e.target.checked })}
                    className="accent-brand-yellow"
                  />
                  <span>Multiple Choice (MCQ)</span>
                </label>
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={types.short}
                    onChange={(e) => setTypes({ ...types, short: e.target.checked })}
                    className="accent-brand-yellow"
                  />
                  <span>Short Answer</span>
                </label>
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={types.long}
                    onChange={(e) => setTypes({ ...types, long: e.target.checked })}
                    className="accent-brand-yellow"
                  />
                  <span>Long Answer / Essay</span>
                </label>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl shadow-yellow-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Questions
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Questions Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {questions.length === 0 ? (
            <div className="glass-card p-12 text-center border-dashed border-border-subtle flex flex-col items-center justify-center h-full">
              <Sparkles className="w-12 h-12 text-brand-yellow/30 mb-4" />
              <h3 className="text-lg font-heading font-bold text-white mb-2">No Questions Generated</h3>
              <p className="text-text-secondary text-sm max-w-sm">Use the left configuration panel to customize and trigger the Gemini AI question compiler.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-bg-dark p-4 rounded-xl border border-border-subtle">
                <span className="text-sm font-semibold text-text-secondary">Generated {questions.length} Items | Total: {questions.reduce((acc, curr) => acc + curr.marks, 0)} Marks</span>
                <button 
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-xs hover:opacity-90 shadow-yellow-glow flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Publish Exam Paper
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="glass-card p-6 space-y-4 border border-border-subtle hover:border-brand-yellow/30 transition-all">
                    <div className="flex justify-between items-start border-b border-border-subtle pb-2">
                      <span className="text-xs font-bold text-brand-yellow uppercase tracking-wider">{q.type.toUpperCase()} | {q.marks} Marks</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => startEdit(idx)}
                          className="p-1 text-text-muted hover:text-white transition-colors"
                          title="Edit Question"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRegenerateQuestion(idx)}
                          className="p-1 text-text-muted hover:text-brand-yellow transition-colors"
                          title="Regenerate Question"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1 text-text-muted hover:text-status-danger transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {editingIndex === idx ? (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editText} 
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 bg-bg-darkest border border-border-subtle focus:border-brand-yellow rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                        />
                        <button 
                          onClick={() => saveEdit(idx)}
                          className="p-1.5 bg-brand-yellow text-bg-darkest rounded hover:opacity-90"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-white">{q.text}</p>
                    )}

                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {q.options.map((opt, oIdx) => (
                          <div 
                            key={oIdx} 
                            className={`p-2 rounded text-xs border ${
                              opt === q.answer 
                                ? 'bg-status-success/10 border-status-success/30 text-status-success font-semibold' 
                                : 'bg-white/2 border-border-subtle text-text-secondary'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save / Publish Dialog Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-card p-8 border-brand-yellow glow-yellow space-y-6">
            <div>
              <h3 className="text-xl font-heading font-black text-white">Publish Exam Paper</h3>
              <p className="text-xs text-text-secondary mt-1">Configure scheduling metadata for student dashboards.</p>
            </div>

            <form onSubmit={handlePublishExam} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Exam Title</label>
                <input 
                  type="text" 
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="JavaScript Array Methods Test" 
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Duration (Mins)</label>
                <input 
                  type="number" 
                  required
                  min={5}
                  value={examDuration}
                  onChange={(e) => setExamDuration(parseInt(e.target.value))}
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Publish Date</label>
                  <input 
                    type="date" 
                    required
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Publish Time</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                      placeholder="08:30"
                      value={publishTime}
                      onChange={(e) => setPublishTime(e.target.value)}
                      className="flex-1 bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                    />
                    <select
                      value={publishAmpm}
                      onChange={(e) => setPublishAmpm(e.target.value)}
                      className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Close Date</label>
                  <input 
                    type="date" 
                    required
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Close Time</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                      placeholder="05:00"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="flex-1 bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                    />
                    <select
                      value={closeAmpm}
                      onChange={(e) => setCloseAmpm(e.target.value)}
                      className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-2.5 border border-border-subtle rounded-lg text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-yellow text-bg-darkest font-bold rounded-lg text-xs hover:opacity-90 shadow-yellow-glow transition-all"
                >
                  Publish to Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
