"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { jsPDF } from 'jspdf';
import { ChevronLeft, BarChart3, AlertTriangle, ShieldCheck, Download, Award, FileText, X, Filter, Activity, RefreshCw, Camera, Video } from 'lucide-react';

export default function ExamReportsPage({ params }) {
  const router = useRouter();
  const [examId, setExamId] = useState(null);
  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [proctorLogs, setProctorLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and Detailed inspector states
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Resolve dynamic route params safely
  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setExamId(resolved.id);
    }
    resolveParams();
  }, [params]);

  // Load Exam stats, results, and proctor logs
  useEffect(() => {
    if (!examId) return;

    async function loadData() {
      try {
        const targetExam = await db.getExam(examId);
        if (!targetExam) {
          alert('Exam not found.');
          router.push('/teacher');
          return;
        }
        setExam(targetExam);

        const allResults = await db.getResults();
        const examResults = allResults.filter(r => r.examId === examId);
        setResults(examResults);

        const logs = await db.getProctoringLogs();
        const examLogs = logs.filter(l => l.examId === examId);
        setProctorLogs(examLogs);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId, router]);

  // Filtering Results based on Risk Level
  const getFilteredResults = () => {
    return results.filter(r => {
      const report = r.proctoringReport;
      let risk = 'low';
      if (report) {
        if (report.finalRiskAssessment?.toLowerCase().includes('high') || report.integrityScore < 60 || r.reviewRequired) {
          risk = 'high';
        } else if (report.integrityScore < 85) {
          risk = 'medium';
        }
      } else if (r.reviewRequired) {
        risk = 'high';
      }

      if (riskFilter === 'all') return true;
      return risk === riskFilter;
    });
  };

  const handleDownloadCSV = () => {
    if (results.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Obtained Marks,Total Marks,Percentage,Passed,Integrity Score,Risk Level,Total Violations,Date Attempted\n";

    results.forEach(r => {
      const report = r.proctoringReport;
      const scoreInt = report ? report.integrityScore : 100;
      const risk = report ? report.finalRiskAssessment : (r.reviewRequired ? "High" : "Low");
      const viols = report ? report.totalViolations : 0;
      
      csvContent += `"${r.studentName}",${r.score},${r.totalMarks},${r.percentage}%,${r.passed ? "Yes" : "No"},${scoreInt}%,"${risk}",${viols},${new Date(r.timestamp).toLocaleDateString()}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ProctorReport_${exam?.title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDFReport = () => {
    const doc = new jsPDF();

    // Deep Dark background theme
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, "F");

    // Gold / Yellow brand colors
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 215, 0); // brand yellow
    doc.text("ExamAI Academic Integrity & Proctor Audit", 15, 25);

    doc.setFontSize(10);
    doc.setTextColor(163, 163, 163);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 32);
    doc.line(15, 36, 195, 36);

    // Exam Metadata details
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`Examination: ${exam?.title}`, 15, 48);

    doc.setFontSize(11);
    doc.setTextColor(163, 163, 163);
    doc.text(`Subject: ${exam?.subject}`, 15, 55);
    doc.text(`Total Marks: ${exam?.totalMarks} | Duration: ${exam?.duration} minutes`, 15, 61);
    doc.text(`Publish: ${db.formatDateTime12H(exam?.publishAt)} | Close: ${db.formatDateTime12H(exam?.closeAt)}`, 15, 67);

    // Class performance summary metrics
    const classAvg = results.length > 0 
      ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length) 
      : 0;
    const classIntegrityAvg = results.length > 0
      ? Math.round(results.reduce((acc, curr) => acc + (curr.proctoringReport ? curr.proctoringReport.integrityScore : 100), 0) / results.length)
      : 100;
    const highRiskCount = results.filter(r => {
      const rep = r.proctoringReport;
      return rep ? (rep.integrityScore < 60 || r.reviewRequired) : r.reviewRequired;
    }).length;

    doc.setFillColor(20, 20, 20);
    doc.rect(15, 76, 180, 32, "F");
    doc.setFontSize(10);
    doc.setTextColor(255, 215, 0);
    doc.text("CLASS SECURITY & PERFORMANCE SUMMARY", 20, 82);
    doc.setTextColor(255, 255, 255);
    doc.text(`Total Submissions: ${results.length}   |   Class Average Grade: ${classAvg}%`, 20, 90);
    doc.text(`Mean Integrity Score: ${classIntegrityAvg}%   |   High Risk Incidents: ${highRiskCount}`, 20, 98);

    // Results table headers
    doc.setFontSize(12);
    doc.setTextColor(255, 215, 0);
    doc.text("Candidate Integrity Rankings", 15, 121);

    doc.setFontSize(8);
    doc.setTextColor(163, 163, 163);
    let yPos = 131;

    doc.text("Student Name", 15, yPos);
    doc.text("Marks", 70, yPos);
    doc.text("Grade %", 95, yPos);
    doc.text("Integrity", 120, yPos);
    doc.text("Risk Level", 145, yPos);
    doc.text("Total Viols", 175, yPos);
    doc.line(15, yPos + 3, 195, yPos + 3);

    yPos += 10;
    doc.setTextColor(255, 255, 255);

    results.forEach((r) => {
      if (yPos > 270) {
        doc.addPage();
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, 210, 297, "F");
        yPos = 30;
      }
      
      const rep = r.proctoringReport;
      const integrity = rep ? `${rep.integrityScore}%` : '100%';
      const risk = rep ? rep.finalRiskAssessment : (r.reviewRequired ? 'High' : 'Low');
      const viols = rep ? rep.totalViolations.toString() : '0';

      doc.text(r.studentName, 15, yPos);
      doc.text(`${r.score}/${r.totalMarks}`, 70, yPos);
      doc.text(`${r.percentage}%`, 95, yPos);
      doc.text(integrity, 120, yPos);
      doc.text(risk, 145, yPos);
      doc.text(viols, 175, yPos);
      
      yPos += 8;
    });

    doc.save(`ExamAI_ProctorReport_${exam?.title.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return <div className="text-text-secondary text-sm">Parsing exam analytics metadata...</div>;
  }

  // Calculate stats
  const submissionCount = results.length;
  const classAvg = submissionCount > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / submissionCount) 
    : 0;
  const meanIntegrity = submissionCount > 0
    ? Math.round(results.reduce((acc, curr) => acc + (curr.proctoringReport ? curr.proctoringReport.integrityScore : 100), 0) / submissionCount)
    : 100;
  const highRiskIncidents = results.filter(r => {
    const rep = r.proctoringReport;
    return rep ? (rep.integrityScore < 60 || r.reviewRequired) : r.reviewRequired;
  }).length;

  const filteredResults = getFilteredResults();

  return (
    <div className="space-y-8 select-none">
      {/* Header breadcrumb */}
      <div className="space-y-4">
        <Link 
          href="/teacher" 
          className="inline-flex items-center gap-1 text-brand-yellow hover:underline text-sm font-semibold animate-pulse"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-black text-white">{exam?.title}</h1>
            <p className="text-text-secondary text-sm">Subject: {exam?.subject} | Created for {exam?.totalMarks} Marks</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadCSV}
              disabled={results.length === 0}
              className="px-4 py-2 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={handleDownloadPDFReport}
              disabled={results.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-xs hover:opacity-90 shadow-yellow-glow flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download Security PDF
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{submissionCount}</span>
            <span className="text-xs text-text-secondary">Submissions Received</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4 border-status-warning/20">
          <div className="bg-status-warning/10 border border-status-warning/20 p-3 rounded-lg text-status-warning">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{meanIntegrity}%</span>
            <span className="text-xs text-text-secondary">Class Mean Integrity</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4 border-status-danger/20">
          <div className="bg-status-danger/10 border border-status-danger/20 p-3 rounded-lg text-status-danger">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{highRiskIncidents}</span>
            <span className="text-xs text-text-secondary">High-Risk Audits</span>
          </div>
        </div>
      </div>

      {/* Submissions List with Proctor Filters */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-4">
          <div>
            <h2 className="text-lg font-heading font-bold text-white">Student Submission Records</h2>
            <p className="text-xs text-text-secondary">Audit and monitor candidates' proctor logs, integrity metrics, and validation flags.</p>
          </div>
          
          {/* Risk filters */}
          <div className="flex items-center gap-2 bg-white/2 border border-border-subtle p-1 rounded-lg text-xs">
            <span className="px-2 font-semibold text-text-muted flex items-center gap-1"><Filter className="w-3 h-3" /> Risk:</span>
            <button 
              onClick={() => setRiskFilter('all')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${riskFilter === 'all' ? 'bg-brand-yellow text-bg-darkest' : 'text-text-secondary hover:text-white'}`}
            >
              All
            </button>
            <button 
              onClick={() => setRiskFilter('high')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${riskFilter === 'high' ? 'bg-status-danger text-white' : 'text-text-secondary hover:text-white'}`}
            >
              High
            </button>
            <button 
              onClick={() => setRiskFilter('medium')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${riskFilter === 'medium' ? 'bg-status-warning text-white' : 'text-text-secondary hover:text-white'}`}
            >
              Medium
            </button>
            <button 
              onClick={() => setRiskFilter('low')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${riskFilter === 'low' ? 'bg-status-success text-white' : 'text-text-secondary hover:text-white'}`}
            >
              Low
            </button>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No submissions match the selected filter query.
          </div>
        ) : (
          <div className="responsive-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Obtained Marks</th>
                  <th>Grade Accuracy</th>
                  <th>Integrity Score</th>
                  <th>Proctor Risk Level</th>
                  <th>Violations</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((res) => {
                  const rep = res.proctoringReport;
                  const intScore = rep ? rep.integrityScore : 100;
                  
                  let risk = 'Low';
                  let riskColorClass = 'bg-status-success/15 text-status-success';
                  if (rep) {
                    risk = rep.finalRiskAssessment;
                    if (risk.toLowerCase().includes('high')) {
                      riskColorClass = 'bg-status-danger/15 text-status-danger font-extrabold pulse-red-border';
                    } else if (risk.toLowerCase().includes('medium')) {
                      riskColorClass = 'bg-status-warning/15 text-status-warning font-bold';
                    }
                  } else if (res.reviewRequired) {
                    risk = 'High';
                    riskColorClass = 'bg-status-danger/15 text-status-danger font-extrabold';
                  }

                  const violsCount = rep ? rep.totalViolations : 0;

                  return (
                    <tr key={res.id}>
                      <td className="font-semibold text-white">{res.studentName}</td>
                      <td className="text-text-secondary">{res.score} / {res.totalMarks}</td>
                      <td className="font-bold text-white">{res.percentage}%</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${intScore < 60 ? 'text-status-danger' : intScore < 85 ? 'text-status-warning' : 'text-status-success'}`}>{intScore}%</span>
                          <div className="w-16 bg-white/5 rounded-full h-1 shrink-0">
                            <div className={`h-1 rounded-full ${intScore < 60 ? 'bg-status-danger' : intScore < 85 ? 'bg-status-warning' : 'bg-status-success'}`} style={{ width: `${intScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-4xs uppercase tracking-wider ${riskColorClass}`}>
                          {risk}
                        </span>
                      </td>
                      <td className={`font-bold ${violsCount > 3 ? 'text-status-danger' : violsCount > 0 ? 'text-status-warning' : 'text-text-secondary'}`}>{violsCount}</td>
                      <td className="text-right">
                        <button 
                          onClick={() => setSelectedAudit(res)}
                          className="px-3 py-1.5 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Activity className="w-3.5 h-3.5" /> Inspect Integrity Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔍 DETAILED STUDENT INTEGRITY AUDIT INSPECTOR MODAL */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl glass-card p-8 border-brand-yellow glow-yellow space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedAudit(null)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-4xs text-brand-yellow font-extrabold uppercase tracking-widest bg-brand-yellow/10 px-2.5 py-0.5 rounded border border-brand-yellow/20">
                Security Audit Record
              </span>
              <h3 className="text-2xl font-heading font-black text-white mt-1.5">Proctor Malpractice & Integrity Inspector</h3>
              <p className="text-xs text-text-secondary">Student Name: <span className="text-white font-bold">{selectedAudit.studentName}</span> | Exam: <span className="text-white font-bold">{selectedAudit.examTitle}</span></p>
            </div>

            {/* Integrity Score HUD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/2 p-5 rounded-xl border border-border-subtle text-center">
              <div>
                <span className="text-3xs text-text-secondary block uppercase font-bold">Integrity Rating</span>
                <span className={`text-2xl font-heading font-black block mt-1 ${
                  (selectedAudit.proctoringReport?.integrityScore || 100) < 60 ? 'text-status-danger' : (selectedAudit.proctoringReport?.integrityScore || 100) < 85 ? 'text-status-warning' : 'text-status-success'
                }`}>
                  {selectedAudit.proctoringReport?.integrityScore ?? 100}%
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-border-subtle pt-3 md:pt-0">
                <span className="text-3xs text-text-secondary block uppercase font-bold">Security Evaluation</span>
                <span className="text-xs font-extrabold text-white block mt-2">
                  {selectedAudit.proctoringReport ? (
                    <span className={`px-2 py-0.5 rounded text-4xs uppercase ${
                      selectedAudit.proctoringReport.finalRiskAssessment.toLowerCase().includes('high') ? 'bg-status-danger/10 text-status-danger border border-status-danger/25' : selectedAudit.proctoringReport.finalRiskAssessment.toLowerCase().includes('medium') ? 'bg-status-warning/10 text-status-warning border border-status-warning/25' : 'bg-status-success/10 text-status-success border border-status-success/25'
                    }`}>
                      {selectedAudit.proctoringReport.finalRiskAssessment}
                    </span>
                  ) : 'Low Risk'}
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-border-subtle pt-3 md:pt-0">
                <span className="text-3xs text-text-secondary block uppercase font-bold">Total Violations</span>
                <span className="text-2xl font-heading font-black text-white block mt-1">
                  {selectedAudit.proctoringReport?.totalViolations ?? 0}
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-border-subtle pt-3 md:pt-0">
                <span className="text-3xs text-text-secondary block uppercase font-bold">Exam Status</span>
                <span className={`text-2xl font-heading font-black block mt-1 ${selectedAudit.passed ? 'text-status-success' : 'text-status-danger'}`}>
                  {selectedAudit.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            {/* Violation Counts breakdown matrix */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-text-secondary tracking-wider">Infraction Logs breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Camera Off:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.cameraDisconnectCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.cameraDisconnectCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Mic Muted:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.microphoneDisconnectCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.microphoneDisconnectCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Exit Fullscreen:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.fullscreenExitCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.fullscreenExitCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Tab Switches:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.tabSwitchCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.tabSwitchCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Window Minimize:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.minimizeCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.minimizeCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Absent Face:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.noFaceCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.noFaceCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Multiple Faces:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.multipleFacesCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.multipleFacesCount ?? 0}</span>
                </div>
                <div className="bg-white/2 p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                  <span className="text-text-secondary">Page Refreshes:</span>
                  <span className={`font-bold ${selectedAudit.proctoringReport?.refreshCount > 0 ? 'text-status-warning' : 'text-white'}`}>{selectedAudit.proctoringReport?.refreshCount ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Malpractice Summary if Auto-Submitted */}
            {selectedAudit.proctoringReport?.malpracticeSubmitted && (
              <div className="p-4 bg-status-danger/10 border border-status-danger/35 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-status-danger uppercase tracking-wider block">🚨 MALPRACTICE AUTO-TERMINATION REPORT</span>
                <p className="text-text-secondary leading-relaxed">
                  The proctoring engine terminated this exam workspace session automatically. 
                  <br />
                  <strong>Auto-submit trigger reason:</strong> <span className="text-white font-bold">{selectedAudit.proctoringReport.autoSubmitReason}</span>.
                </p>
              </div>
            )}

            {/* Split layout: Recording & Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Video Recording */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-text-secondary tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-brand-yellow" /> Webcam Video Audit
                </h4>
                {(() => {
                  const report = selectedAudit.proctoringReport;
                  const metadata = report?.recordingMetadata;

                  if (metadata) {
                    return (
                      <div className="space-y-4">
                        {/* Status Card */}
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
                          metadata.recordingAvailable 
                            ? 'bg-brand-yellow/5 border-brand-yellow/20' 
                            : 'bg-status-danger/5 border-status-danger/20'
                        }`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-text-secondary">Local Recording Status:</span>
                            <span className={metadata.recordingAvailable ? 'text-brand-yellow' : 'text-status-danger'}>
                              {metadata.recordingAvailable ? '🟢 Active (Stored Locally)' : '❌ Not Available'}
                            </span>
                          </div>
                          
                          {metadata.recordingAvailable && (
                            <div className="space-y-1.5 text-[11px] text-text-muted border-t border-white/5 pt-2">
                              <div><strong className="text-text-secondary">File Size:</strong> {(metadata.recordingSize / (1024 * 1024)).toFixed(2)} MB</div>
                              <div><strong className="text-text-secondary">Duration:</strong> {metadata.recordingDuration ? `${Math.floor(metadata.recordingDuration / 60)}m ${metadata.recordingDuration % 60}s` : 'Unknown'}</div>
                              <div><strong className="text-text-secondary">Recorded At:</strong> {new Date(metadata.recordingTimestamp).toLocaleString()}</div>
                            </div>
                          )}
                        </div>

                        {/* Instructions for obtaining local copy */}
                        <div className="p-4 bg-white/2 border border-border-subtle rounded-xl text-xs leading-relaxed space-y-2">
                          <span className="font-extrabold text-white uppercase block text-2xs">📂 Local Recording Mode Details</span>
                          <p className="text-text-secondary text-[11px]">
                            This workspace runs on the Firebase Spark plan (cloud storage disabled). 
                            The webcam video was recorded and stored locally on the student's browser. 
                            Please request the downloaded WebM file directly from <strong className="text-white">{metadata.studentName}</strong>.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Fallback for legacy database records
                  if (report?.recordingUrl && !report.recordingUrl.startsWith('blob:')) {
                    return (
                      <div className="space-y-3">
                        <div className="relative aspect-video bg-bg-darkest rounded-xl border border-border-subtle overflow-hidden">
                          <video 
                            src={report.recordingUrl} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <a 
                          href={report.recordingUrl}
                          download={`Recording_${selectedAudit.studentName.replace(/\s+/g, "_")}.webm`}
                          className="w-full py-2 bg-white/5 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-4xs font-bold rounded-lg text-center block transition-colors"
                        >
                          Download Webcam Recording
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div className="aspect-video bg-bg-darkest rounded-xl border border-dashed border-border-subtle flex flex-col items-center justify-center text-text-secondary text-3xs p-4 text-center">
                      <span>No recording available for this session.</span>
                      <span className="text-text-muted mt-1">(Dual-mode is in demo/legacy mode or the recording was aborted)</span>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-text-secondary tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-brand-yellow" /> Live Session Event Timeline
                </h4>
                
                {(!selectedAudit.proctoringReport?.events || selectedAudit.proctoringReport.events.length === 0) ? (
                  <div className="text-center py-12 text-text-secondary text-3xs border border-dashed border-border-subtle rounded-xl">
                    No integrity warnings triggered during this session.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 border-l border-border-subtle pl-4 ml-2">
                    {selectedAudit.proctoringReport.events.map((evt, idx) => (
                      <div key={idx} className="relative text-xs space-y-1">
                        <div className="absolute -left-[22px] top-1.5 w-2 h-2 rounded-full bg-brand-yellow" />
                        <div className="flex justify-between font-semibold">
                          <span className="text-white text-3xs">{evt.type}</span>
                          <span className="text-text-muted text-[9px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-text-secondary text-4xs">{evt.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border-subtle">
              <button 
                onClick={() => setSelectedAudit(null)}
                className="w-full py-3 bg-brand-yellow text-bg-darkest font-extrabold rounded-xl text-xs hover:opacity-90 shadow-yellow-glow transition-all"
              >
                Dismiss Audit Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
