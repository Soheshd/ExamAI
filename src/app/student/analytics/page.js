"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, Compass, Award } from 'lucide-react';

export default function StudentAnalytics() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const list = await db.getResults();
        // Filter results only for current student
        const studentResults = list.filter(
          r => r.studentId === (user?.id || 'usr-student')
        );
        // Sort chronologically
        const sorted = studentResults.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setResults(sorted);
      } catch (err) {
        console.error('Failed to load results for charts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [user]);

  if (loading) {
    return <div className="text-text-secondary text-sm">Parsing grading charts...</div>;
  }

  // Format Chart Data
  // 1. Progress trend chart (score percentage over time)
  const trendData = results.map((r, idx) => ({
    name: `Test ${idx + 1}`,
    score: r.percentage,
    title: r.examTitle.length > 15 ? r.examTitle.substring(0, 12) + "..." : r.examTitle
  }));

  // 2. Subject accuracy comparison
  const subjectsGroup = results.reduce((acc, curr) => {
    if (!acc[curr.subject]) {
      acc[curr.subject] = { total: 0, count: 0 };
    }
    acc[curr.subject].total += curr.percentage;
    acc[curr.subject].count += 1;
    return acc;
  }, {});

  const subjectData = Object.keys(subjectsGroup).map(sub => ({
    name: sub,
    accuracy: Math.round(subjectsGroup[sub].total / subjectsGroup[sub].count)
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-black text-white">Performance Analytics</h1>
        <p className="text-text-secondary text-sm">Visualize grading trends, accuracy by subject categories, and weak area diagnoses.</p>
      </div>

      {results.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed border-border-subtle flex flex-col items-center justify-center">
          <BarChart3 className="w-12 h-12 text-brand-yellow/30 mb-4" />
          <h3 className="text-lg font-heading font-bold text-white mb-2">No Grading Metrics Found</h3>
          <p className="text-text-secondary text-sm max-w-sm">Complete examinations on your dashboard first to compile performance analytics graphs.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score progress trend */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-yellow" /> Accuracy Progress Trend
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                    <YAxis stroke="#737373" fontSize={10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#FFD700" 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject accuracy comparison */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-yellow" /> Accuracy by Subject Domain
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                    <YAxis stroke="#737373" fontSize={10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar 
                      dataKey="accuracy" 
                      fill="#FFD700" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Diagnosis breakdown */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-yellow" /> Cognitive Weakness Diagnosis Table
            </h3>

            <div className="responsive-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Examination Attempted</th>
                    <th>Subject</th>
                    <th>Accuracy Obtained</th>
                    <th>Diagnosed Weak Topic</th>
                    <th>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res) => (
                    <tr key={res.id}>
                      <td className="font-semibold text-white">{res.examTitle}</td>
                      <td className="text-text-secondary">{res.subject}</td>
                      <td className="font-bold" style={{ color: res.passed ? '#10b981' : '#ef4444' }}>{res.percentage}%</td>
                      <td className="text-text-secondary text-xs">{res.weakArea || 'None'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-4xs font-extrabold tracking-wider ${
                          res.passed ? 'bg-status-success/15 text-status-success' : 'bg-status-danger/15 text-status-danger'
                        }`}>
                          {res.passed ? 'SECURE' : 'INCOMPLETE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
