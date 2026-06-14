"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { jsPDF } from 'jspdf';
import { BookOpen, Award, TrendingDown, Clock, Download, X, AlertTriangle, CheckSquare, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Performance Report Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [localRecordingBlob, setLocalRecordingBlob] = useState(null);
  const [selectedReportQuestions, setSelectedReportQuestions] = useState([]);

  useEffect(() => {
    async function loadReportData() {
      if (!selectedReport) {
        setLocalRecordingBlob(null);
        setSelectedReportQuestions([]);
        return;
      }
      // Load recording copy
      try {
        const { getLocalRecording } = await import('@/lib/indexedDb');
        const blob = await getLocalRecording(selectedReport.studentId || 'usr-student', selectedReport.examId);
        setLocalRecordingBlob(blob);
      } catch (err) {
        console.error('Failed to check local recording:', err);
        setLocalRecordingBlob(null);
      }
      // Load exam questions
      try {
        const targetExam = await db.getExam(selectedReport.examId);
        if (targetExam) {
          setSelectedReportQuestions(targetExam.questions || []);
        }
      } catch (err) {
        console.error('Failed to fetch exam questions for report:', err);
      }
    }
    loadReportData();
  }, [selectedReport]);

  useEffect(() => {
    async function loadStudentData() {
      try {
        const examList = await db.getExams();
        const resultsList = await db.getResults();
        
        // Filter results only for current student (support demo id usr-student)
        const studentResults = resultsList.filter(
          r => r.studentId === user.id || r.studentId === 'usr-student'
        );
        
        setExams(examList);
        setResults(studentResults);
      } catch (err) {
        console.error('Failed to load student dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [user]);

  const handleDownloadCertificate = (report) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Dark Background border
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 297, 210, "F");

    // Gold borders
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, 281, 194);

    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 277, 190);

    // Decorative graphics
    doc.setFillColor(255, 215, 0);
    // Top-left corner ribbon
    doc.triangle(10, 10, 30, 10, 10, 30, "F");
    // Bottom-right corner ribbon
    doc.triangle(287, 200, 287, 180, 267, 200, "F");

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 215, 0); // brand yellow
    doc.text("CERTIFICATE OF ACCOMPLISHMENT", 148, 45, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(163, 163, 163);
    doc.text("EXAMAI DIGITAL ACADEMIC AUDIT PROTOCOL", 148, 54, { align: "center" });

    // Certificate Body
    doc.setFont("times", "italic");
    doc.setFontSize(16);
    doc.setTextColor(230, 230, 230);
    doc.text("This document validates that", 148, 78, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(report.studentName.toUpperCase(), 148, 92, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(200, 200, 200);
    doc.text("has successfully completed the online examination under proctored supervision", 148, 106, { align: "center" });

    // Exam Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 215, 0);
    doc.text(report.examTitle, 148, 118, { align: "center" });

    // Subject and Score details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(163, 163, 163);
    doc.text(`Subject Category: ${report.subject}`, 148, 128, { align: "center" });

    // Score Board Panel
    doc.setFillColor(20, 20, 20);
    doc.rect(80, 138, 137, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Earned Marks: ${report.score} / ${report.totalMarks}   |   Accuracy Grade: ${report.percentage}%`, 148, 150, { align: "center" });

    // Signatures
    doc.setDrawColor(80, 80, 80);
    doc.line(40, 182, 100, 182);
    doc.line(197, 182, 257, 182);

    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("AI Proctor Validator", 70, 188, { align: "center" });
    doc.text("Authorized Academic Registrar", 227, 188, { align: "center" });

    // Unique verification ID
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`VERIFICATION HASH: ${report.id}-${report.timestamp.replace(/[:.-]/g, "")}`, 148, 198, { align: "center" });

    doc.save(`Certificate_${report.examTitle.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return <div className="text-text-secondary text-sm">Loading student dashboard data...</div>;
  }

  // Calculate Metrics
  const examsTaken = results.length;
  const avgScore = examsTaken > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / examsTaken) 
    : 0;
  const weakestSubject = examsTaken > 0 
    ? results.sort((a,b) => a.percentage - b.percentage)[0].subject 
    : 'None';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-heading font-black text-white">Welcome back, {user.name}</h1>
        <p className="text-text-secondary text-sm">Monitor your tests, review study calendars, and practice viva simulations.</p>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{examsTaken}</span>
            <span className="text-xs text-text-secondary">Tests Attempted</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{avgScore}%</span>
            <span className="text-xs text-text-secondary">Average Score</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white truncate max-w-[180px]">{weakestSubject}</span>
            <span className="text-xs text-text-secondary">Weakest Domain</span>
          </div>
        </div>
      </div>

      {/* Available Exams Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-yellow" /> Scheduled Examinations
        </h2>
        
        {exams.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border-subtle rounded-xl text-text-secondary text-sm">
            No examinations are scheduled at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((ex) => (
              <div key={ex.id} className="glass-card p-6 flex flex-col gap-4 border border-border-subtle hover:border-brand-yellow/30 transition-all">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-brand-yellow uppercase tracking-wider font-extrabold">{ex.subject}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                      ex.status === 'live' 
                        ? 'bg-status-success/15 text-status-success border-status-success/25' 
                        : ex.status === 'scheduled'
                        ? 'bg-brand-yellow/15 text-brand-yellow border-brand-yellow/25'
                        : 'bg-white/5 text-text-secondary border-white/10'
                    }`}>
                      {ex.status === 'live' ? 'Live' : ex.status === 'scheduled' ? 'Scheduled' : 'Closed'}
                    </span>
                    <span className="bg-white/5 border border-border-subtle px-2 py-0.5 rounded text-4xs font-bold uppercase">{ex.difficulty}</span>
                  </div>
                </div>
                <h3 className="text-lg font-heading font-bold text-white leading-snug">{ex.title}</h3>
                
                <div className="space-y-1 text-[10px] text-text-secondary border-t border-border-subtle pt-3 text-left">
                  <div>
                    <span className="text-text-muted">Publish: </span>
                    <span className="font-bold text-white">{db.formatDateTime12H(ex.publishAt)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Close: </span>
                    <span className="font-bold text-white">{db.formatDateTime12H(ex.closeAt)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-3xs text-text-secondary border-t border-border-subtle pt-3">
                  <div>
                    <span className="block font-bold text-white">{ex.questionsCount || ex.questions?.length || 0} Qs</span>
                    <span>Format Size</span>
                  </div>
                  <div>
                    <span className="block font-bold text-white">{ex.totalMarks} Marks</span>
                    <span>Total Target</span>
                  </div>
                  <div>
                    <span className="block font-bold text-white">{ex.duration} Mins</span>
                    <span>Timer Limit</span>
                  </div>
                </div>

                {ex.status === 'live' ? (
                  <Link 
                    href={`/student/exam/${ex.id}`}
                    className="w-full py-2.5 bg-brand-yellow text-bg-darkest font-bold text-center rounded-lg text-xs hover:opacity-90 shadow-yellow-glow mt-4 transition-all block"
                  >
                    Start Secured Test
                  </Link>
                ) : ex.status === 'scheduled' ? (
                  <button 
                    disabled
                    className="w-full py-2.5 bg-white/5 border border-white/10 text-text-secondary font-bold text-center rounded-lg text-xs mt-4 cursor-not-allowed"
                  >
                    Start Secured Test (Locked)
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full py-2.5 bg-white/5 border border-white/10 text-text-muted font-bold text-center rounded-lg text-xs mt-4 cursor-not-allowed"
                  >
                    Exam Closed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Certificates List */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-xl font-heading font-bold text-white">Academic Performance Reports</h2>
        
        {results.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No grading records published yet. Complete an exam to view reports.
          </div>
        ) : (
          <div className="responsive-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Subject</th>
                  <th>Obtained Marks</th>
                  <th>Percentage</th>
                  <th>Grading Status</th>
                  <th>Date Attempted</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <button 
                        onClick={() => setSelectedReport(res)}
                        className="text-white hover:text-brand-yellow font-semibold text-left transition-colors"
                      >
                        {res.examTitle}
                      </button>
                    </td>
                    <td className="text-text-secondary">{res.subject}</td>
                    <td className="text-text-secondary">{res.score} / {res.totalMarks}</td>
                    <td className="font-bold" style={{ color: res.passed ? '#10b981' : '#ef4444' }}>{res.percentage}%</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-4xs font-extrabold tracking-wider ${
                        res.passed ? 'bg-status-success/15 text-status-success' : 'bg-status-danger/15 text-status-danger'
                      }`}>
                        {res.passed ? "PASSED" : "FAILED"}
                      </span>
                    </td>
                    <td className="text-text-secondary text-xs">{new Date(res.timestamp).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button 
                        onClick={() => setSelectedReport(res)}
                        className="px-3 py-1.5 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-xs font-semibold rounded-lg transition-colors"
                      >
                        Inspect Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Report Dialog Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl glass-card p-8 border-brand-yellow glow-yellow space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-2xl font-heading font-black text-white">Academic Validation Audit</h3>
              <p className="text-xs text-text-secondary mt-1">Digital performance sheet issued by ExamAI registry.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-4 text-sm">
              <div>
                <span className="text-xs text-text-secondary block font-bold uppercase">Candidate Name</span>
                <span className="font-semibold text-white">{selectedReport.studentName}</span>
              </div>
              <div>
                <span className="text-xs text-text-secondary block font-bold uppercase">Subject Category</span>
                <span className="font-semibold text-white">{selectedReport.subject}</span>
              </div>
              <div>
                <span className="text-xs text-text-secondary block font-bold uppercase">Examination Name</span>
                <span className="font-semibold text-white">{selectedReport.examTitle}</span>
              </div>
              <div>
                <span className="text-xs text-text-secondary block font-bold uppercase">Completed Timestamp</span>
                <span className="font-semibold text-white">{new Date(selectedReport.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Score Box */}
            <div className="flex justify-around items-center bg-white/2 p-6 rounded-xl border border-border-subtle">
              <div className="text-center">
                <span className="text-xs text-text-secondary block uppercase">Obtained Score</span>
                <span className="text-3xl font-heading font-black text-white mt-1">
                  {selectedReport.score} <span className="text-lg text-text-secondary">/ {selectedReport.totalMarks}</span>
                </span>
              </div>
              <div className="w-px h-12 bg-border-subtle" />
              <div className="text-center">
                <span className="text-xs text-text-secondary block uppercase">Grade Accuracy</span>
                <span className="text-3xl font-heading font-black mt-1" style={{ color: selectedReport.passed ? '#10b981' : '#ef4444' }}>
                  {selectedReport.percentage}%
                </span>
              </div>
            </div>

            {/* Weak Area Diagnosis */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-brand-yellow" /> AI Weakness Diagnosis
              </h4>
              <div className="p-4 bg-status-danger/5 border border-status-danger/15 rounded-lg text-xs text-text-secondary leading-relaxed">
                We detected conceptual weaknesses in: <span className="text-white font-bold">{selectedReport.weakArea || "None"}</span>.
                <br/>
                We have adjusted your Study Planner task lists to include revision blocks targeting this topic.
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">Professor Feedback</h4>
              <p className="text-xs text-text-secondary italic leading-relaxed bg-white/2 p-4 rounded-lg border border-border-subtle">
                "{selectedReport.feedbacks || "Great work overall. Solid response depth."}"
              </p>
            </div>

            {/* Local Recording Retrieval block */}
            {localRecordingBlob && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-brand-yellow" /> Saved Local Video Recording
                </h4>
                <div className="p-4 bg-brand-yellow/5 border border-brand-yellow/20 rounded-xl flex items-center justify-between gap-4 text-xs text-text-secondary">
                  <div className="space-y-0.5">
                    <span className="text-white font-bold block">Local Video Copy Available</span>
                    <span className="text-[10px] text-text-muted">
                      Stored in this browser's IndexedDB (Size: {(localRecordingBlob.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(localRecordingBlob);
                      const a = document.createElement('a');
                      a.style.display = 'none';
                      a.href = url;
                      a.download = `ExamAI_Recording_${selectedReport.examTitle.replace(/\s+/g, '_')}_${selectedReport.studentName.replace(/\s+/g, '_')}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }, 100);
                    }}
                    className="px-3.5 py-2 bg-brand-yellow text-bg-darkest font-extrabold rounded-lg text-2xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                  >
                    Download WebM
                  </button>
                </div>
              </div>
            )}

            {/* Question Review Section */}
            {selectedReportQuestions && selectedReportQuestions.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase text-text-secondary tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-brand-yellow" /> Question-by-Question Review
                </h4>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 border border-border-subtle rounded-xl p-4 bg-white/2">
                  {selectedReportQuestions.map((q, idx) => {
                    const ans = selectedReport.responses[q.id] || '';
                    let isCorrect = false;
                    let correctAnsDisplay = '';
                    let studentAnsDisplay = ans || '(No response)';

                    if (q.type === 'mcq') {
                      isCorrect = ans.trim().toLowerCase() === q.answer.trim().toLowerCase();
                      correctAnsDisplay = q.answer;
                    } else {
                      // Subjective free-text grading simulation
                      const textLen = ans.trim().length;
                      let earned = 0;
                      if (textLen > 150) earned = q.marks;
                      else if (textLen > 50) earned = Math.round(q.marks * 0.7);
                      else if (textLen > 5) earned = Math.round(q.marks * 0.3);
                      isCorrect = earned === q.marks;
                      correctAnsDisplay = "Comprehensive answer (> 150 characters) with proper technical terms.";
                    }

                    const handleExplain = () => {
                      // Dispatch custom event to trigger AI Assistant chat drawer
                      const event = new CustomEvent('examai-explain-question', {
                        detail: {
                          question: q.text,
                          studentAnswer: studentAnsDisplay,
                          correctAnswer: correctAnsDisplay,
                          subject: selectedReport.subject,
                          examTitle: selectedReport.examTitle
                        }
                      });
                      window.dispatchEvent(event);
                    };

                    return (
                      <div key={q.id || idx} className="space-y-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-white leading-relaxed text-left">
                            {idx + 1}. {q.text}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                            isCorrect 
                              ? 'bg-status-success/15 text-status-success border border-status-success/25' 
                              : 'bg-status-danger/15 text-status-danger border border-status-danger/25'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="text-[11px] space-y-1 pl-3 border-l border-white/10 text-left">
                          <div>
                            <span className="text-text-muted">Your Answer: </span>
                            <span className={isCorrect ? 'text-status-success font-semibold' : 'text-status-danger font-semibold'}>
                              {studentAnsDisplay}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-text-muted">Correct Answer: </span>
                              <span className="text-white font-semibold">{correctAnsDisplay}</span>
                            </div>
                          )}
                        </div>

                        {!isCorrect && (
                          <div className="pt-1 pl-3 text-left">
                            <button
                              onClick={handleExplain}
                              className="px-2.5 py-1 bg-brand-yellow/10 border border-brand-yellow/30 hover:bg-brand-yellow hover:text-bg-darkest text-brand-yellow text-[9px] font-bold rounded flex items-center gap-1 transition-all"
                            >
                              <Sparkles className="w-3 h-3 animate-pulse" /> Explain This To Me
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => handleDownloadCertificate(selectedReport)}
                className="flex-1 py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl text-xs hover:opacity-90 shadow-yellow-glow transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Certificate PDF
              </button>
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-6 py-3 border border-border-subtle rounded-xl text-xs font-bold hover:bg-white/5 transition-colors"
              >
                Dismiss Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
