"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { BookOpen, UserCheck, BarChart3, Clock, Plus, Trash2, ArrowRight } from 'lucide-react';

export default function TeacherDashboard() {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'scheduled', 'closed'

  // Load created exams and student results
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const examList = await db.getExams();
        const resultsList = await db.getResults();
        setExams(examList);
        setResults(resultsList);
      } catch (err) {
        console.error('Failed to load teacher dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleDeleteExam = async (examId) => {
    if (confirm('Are you sure you want to permanently delete this exam and all its questions?')) {
      try {
        await db.deleteExam(examId);
        setExams(exams.filter(ex => ex.id !== examId));
      } catch (err) {
        alert(`Failed to delete exam: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="text-text-secondary text-sm">Loading dashboard statistics...</div>;
  }

  // Calculate Metrics
  const totalExamsCreated = exams.length;
  const activeStudents = new Set(results.map(r => r.studentId)).size;
  const averagePerformance = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length) 
    : 0;
  const upcomingExamsCount = exams.filter(ex => ex.status === 'scheduled').length;
  const liveExamsCount = exams.filter(ex => ex.status === 'live').length;
  const closedExamsCount = exams.filter(ex => ex.status === 'closed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-black text-white">Teacher Dashboard</h1>
          <p className="text-text-secondary text-sm">Create automated examinations, manage tests, and review student grades.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/teacher/monitor" 
            className="px-4 py-2.5 bg-bg-dark border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" /> Monitor Live Exams
          </Link>
          <Link 
            href="/teacher/generator" 
            className="px-4 py-2.5 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-sm hover:opacity-90 shadow-yellow-glow flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Generate Exam Paper
          </Link>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{totalExamsCreated}</span>
            <span className="text-xs text-text-secondary">Exams Created</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{activeStudents}</span>
            <span className="text-xs text-text-secondary">Active Students</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{averagePerformance}%</span>
            <span className="text-xs text-text-secondary">Average Accuracy</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{upcomingExamsCount}</span>
            <span className="text-xs text-text-secondary">Upcoming Exams</span>
          </div>
        </div>
      </div>

      {/* Exams Management Table */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-heading font-bold text-white">Examinations Registry</h2>
          
          <div className="flex bg-white/2 border border-border-subtle p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'live' ? 'bg-brand-yellow text-bg-darkest' : 'text-text-secondary hover:text-white'
              }`}
            >
              Live Exams ({liveExamsCount})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'scheduled' ? 'bg-brand-yellow text-bg-darkest' : 'text-text-secondary hover:text-white'
              }`}
            >
              Scheduled ({upcomingExamsCount})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'closed' ? 'bg-brand-yellow text-bg-darkest' : 'text-text-secondary hover:text-white'
              }`}
            >
              Closed ({closedExamsCount})
            </button>
          </div>
        </div>
        
        {exams.filter(ex => ex.status === activeTab).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border-subtle rounded-xl">
            <p className="text-text-secondary text-sm mb-4">No {activeTab} examinations found.</p>
            {activeTab === 'scheduled' && (
              <Link 
                href="/teacher/generator" 
                className="text-brand-yellow text-xs font-bold hover:underline"
              >
                Generate a new test paper with Gemini AI &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="responsive-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Subject</th>
                  <th>Questions</th>
                  <th>Marks</th>
                  <th>Duration</th>
                  <th>Publish Date/Time</th>
                  <th>Close Date/Time</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.filter(ex => ex.status === activeTab).map((ex) => (
                  <tr key={ex.id}>
                    <td>
                      <Link 
                        href={`/teacher/exams/${ex.id}`}
                        className="text-white hover:text-brand-yellow font-semibold transition-colors"
                      >
                        {ex.title}
                      </Link>
                    </td>
                    <td className="text-text-secondary">{ex.subject}</td>
                    <td className="text-text-secondary">{ex.questionsCount || ex.questions?.length || 0} Qs</td>
                    <td className="text-text-secondary">{ex.totalMarks} Marks</td>
                    <td className="text-text-secondary">{ex.duration} mins</td>
                    <td className="text-text-secondary text-xs">{db.formatDateTime12H(ex.publishAt)}</td>
                    <td className="text-text-secondary text-xs">{db.formatDateTime12H(ex.closeAt)}</td>
                    <td className="text-right flex items-center justify-end gap-2">
                      <Link 
                        href={`/teacher/exams/${ex.id}`} 
                        className="px-3 py-1.5 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        Reports <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button 
                        onClick={() => handleDeleteExam(ex.id)}
                        className="p-1.5 text-text-muted hover:text-status-danger rounded-lg transition-colors"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
