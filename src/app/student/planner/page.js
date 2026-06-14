"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ai } from '@/lib/gemini';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Calendar, BookOpen, AlertCircle, CheckSquare, Square, RefreshCw } from 'lucide-react';

export default function AIStudyPlanner() {
  const { user } = useAuth();
  
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadPlannerData() {
      try {
        const plan = await db.getStudyPlan(user?.id || 'usr-student');
        if (plan) {
          setWeeklyTasks(plan.weeklySchedule || []);
          setRecommendations(plan.recommendations || []);
        } else {
          // Initialize empty defaults
          setWeeklyTasks([]);
          setRecommendations([
            "Complete a test in the dashboard to identify academic weaknesses.",
            "Once weaknesses are logged, click 'Compile AI Study Plan' above."
          ]);
        }
      } catch (err) {
        console.error('Failed to load planner details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlannerData();
  }, [user]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      // Gather results to feed topics to Gemini
      const results = await db.getResults();
      const studentResults = results.filter(r => r.studentId === (user?.id || 'usr-student'));
      const weakAreas = studentResults.map(r => r.weakArea).filter(Boolean);
      const subjectScores = studentResults.map(r => ({ subject: r.subject, score: r.percentage }));

      const upcomingExams = await db.getExams();

      const plan = await ai.generateStudyPlan(subjectScores, weakAreas, upcomingExams);
      
      // Save to DB
      await db.saveStudyPlan(user?.id || 'usr-student', plan);
      
      setWeeklyTasks(plan.weeklySchedule || []);
      setRecommendations(plan.recommendations || []);
    } catch (err) {
      alert(`Plan generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTaskDone = async (idx) => {
    const updated = [...weeklyTasks];
    updated[idx].done = !updated[idx].done;
    setWeeklyTasks(updated);

    try {
      const plan = {
        weeklySchedule: updated,
        recommendations: recommendations
      };
      await db.saveStudyPlan(user?.id || 'usr-student', plan);
    } catch (err) {
      console.error('Failed to save updated task checklist:', err);
    }
  };

  if (loading) {
    return <div className="text-text-secondary text-sm">Loading AI Study configurations...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-black text-white">AI Study Planner</h1>
          <p className="text-text-secondary text-sm">Custom study tasks compiled by Gemini targeting your weakest cognitive areas.</p>
        </div>
        
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="px-4 py-2.5 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-sm hover:opacity-90 shadow-yellow-glow flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Re-Compiling...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Compile AI Study Plan
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Schedule Panel */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-yellow" /> Weekly Study Schedule
          </h2>

          {weeklyTasks.length === 0 ? (
            <div className="glass-card p-12 text-center border-dashed border-border-subtle flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-brand-yellow/30 mb-4" />
              <h3 className="text-lg font-heading font-bold text-white mb-2">No Revision Blocks Scheduled</h3>
              <p className="text-text-secondary text-sm max-w-sm mb-4">Click the 'Compile AI Study Plan' button to configure your weekly task list.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyTasks.map((t, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleTaskDone(idx)}
                  className={`glass-card p-5 border flex items-start gap-4 cursor-pointer select-none transition-all ${
                    t.done 
                      ? 'border-status-success/20 bg-status-success/5 opacity-60' 
                      : 'border-border-subtle hover:border-brand-yellow/30'
                  }`}
                >
                  <div className="pt-0.5 shrink-0 text-brand-yellow">
                    {t.done ? (
                      <CheckSquare className="w-5 h-5 text-status-success" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-4xs font-heading font-extrabold uppercase tracking-widest text-brand-yellow">{t.day}</span>
                    <p className={`text-sm font-semibold text-white leading-snug ${t.done ? 'line-through text-text-secondary' : ''}`}>
                      {t.task}
                    </p>
                    <span className="text-3xs text-text-secondary block font-bold">{t.duration} Minutes Block</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Advice / Recommendations Panel */}
        <div className="glass-card p-6 space-y-6 h-fit border-brand-yellow/20">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2 border-b border-border-subtle pb-2">
            <BookOpen className="w-5 h-5 text-brand-yellow" /> Learning Insights
          </h3>

          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 text-xs leading-relaxed text-text-secondary">
                <div className="bg-brand-yellow/10 border border-brand-yellow/20 w-6 h-6 rounded-full flex items-center justify-center text-brand-yellow text-3xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="flex-1">{rec}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/2 p-4 rounded-lg border border-border-subtle text-3xs text-text-secondary leading-normal flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
            <p>Recommendations refresh dynamically after completing online tests and identifying new cognitive weaknesses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
