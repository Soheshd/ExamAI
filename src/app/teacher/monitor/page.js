"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ChevronLeft, Shield, AlertTriangle, Activity, X, UserX, UserCheck, RefreshCw } from 'lucide-react';

export default function ActiveMonitoringPage() {
  const router = useRouter();
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [terminateReason, setTerminateReason] = useState("Proctor administration manual termination: Suspected malpractice.");

  // Poll intervals
  useEffect(() => {
    async function loadSessions() {
      try {
        const list = await db.getActiveSessions();
        setActiveSessions(list);
      } catch (err) {
        console.error('Failed to load active proctoring sessions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
    const interval = setInterval(loadSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  // Force Terminate active exam session
  const handleForceTerminate = async (studentId, studentName) => {
    if (confirm(`CAUTION: Are you sure you want to force-terminate ${studentName}'s exam session? This will immediately lock their page and submit their exam for malpractice review.`)) {
      try {
        await db.forceTerminateSession(studentId, terminateReason);
        alert(`Secured Workspace Force-Terminated for student: ${studentName}`);
        
        // Optimistic UI update for mock students (so they disappear instantly)
        setActiveSessions(prev => prev.filter(s => s.studentId !== studentId));
        setSelectedSession(null);
      } catch (err) {
        alert(`Failed to terminate session: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-bg-darkest flex items-center justify-center text-text-secondary text-sm">Synchronizing live proctor grid feeds...</div>;
  }

  // Count active stats
  const activeCount = activeSessions.length;
  const highRiskCount = activeSessions.filter(s => s.integrityScore < 60 || s.finalRiskAssessment?.toLowerCase().includes('high')).length;
  const mediumRiskCount = activeSessions.filter(s => s.integrityScore >= 60 && s.integrityScore < 85).length;

  return (
    <div className="min-h-screen bg-bg-darkest text-white p-8 space-y-8 select-none">
      
      {/* Header */}
      <div className="space-y-4">
        <Link 
          href="/teacher" 
          className="inline-flex items-center gap-1 text-brand-yellow hover:underline text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Faculty Home
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-black text-white flex items-center gap-2">
              <Shield className="w-8 h-8 text-brand-yellow animate-pulse" /> Active Exam Security Dashboard
            </h1>
            <p className="text-sm text-text-secondary">
              Real-time monitoring panel displaying live candidate proctor feeds, integrity scoring indexes, and active violations.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/3 border border-border-subtle px-3 py-1.5 rounded-full text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping" />
            <span className="font-mono text-text-secondary">AUTO-REFRESH ACTIVE (3s)</span>
          </div>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{activeCount}</span>
            <span className="text-xs text-text-secondary">Active Candidates</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4 border-status-warning/20">
          <div className="bg-status-warning/10 border border-status-warning/20 p-3 rounded-lg text-status-warning animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{mediumRiskCount}</span>
            <span className="text-xs text-text-secondary">Medium-Risk Concerns</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4 border-status-danger/20">
          <div className="bg-status-danger/10 border border-status-danger/20 p-3 rounded-lg text-status-danger animate-pulse">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{highRiskCount}</span>
            <span className="text-xs text-text-secondary">High-Risk Violations</span>
          </div>
        </div>
      </div>

      {/* Grid Layout of Active Students */}
      {activeCount === 0 ? (
        <div className="text-center py-24 border border-dashed border-border-subtle rounded-xl text-text-secondary text-sm">
          No candidates are currently attempting an examination.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activeSessions.map((session) => {
            const intScore = session.integrityScore ?? 100;
            const isHighRisk = intScore < 60 || session.finalRiskAssessment?.toLowerCase().includes('high');
            const isMedRisk = intScore >= 60 && intScore < 85;
            
            let cardBorderClass = 'border-border-subtle';
            let statusColorClass = 'bg-status-success/15 text-status-success';
            let scoreColorClass = 'text-status-success';
            let riskLevel = 'Low Risk';

            if (isHighRisk) {
              cardBorderClass = 'border-status-danger pulse-red-border';
              statusColorClass = 'bg-status-danger/15 text-status-danger';
              scoreColorClass = 'text-status-danger font-extrabold';
              riskLevel = 'High Risk';
            } else if (isMedRisk) {
              cardBorderClass = 'border-status-warning pulse-yellow-border';
              statusColorClass = 'bg-status-warning/15 text-status-warning';
              scoreColorClass = 'text-status-warning font-bold';
              riskLevel = 'Medium Risk';
            }

            return (
              <div 
                key={session.studentId}
                className={`glass-card overflow-hidden flex flex-col justify-between border transition-all hover:scale-[1.02] cursor-pointer ${cardBorderClass}`}
                onClick={() => setSelectedSession(session)}
              >
                {/* Visual Camera Feed Display */}
                <div className="relative aspect-video bg-bg-darkest border-b border-border-subtle overflow-hidden">
                  {session.latestFrame ? (
                    <img 
                      src={session.latestFrame} 
                      alt="Student Live Feed Thumbnail" 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    // Premium simulated webcam display
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-text-muted space-y-1">
                      <div className="w-8 h-8 rounded-full border border-dashed border-brand-yellow/30 flex items-center justify-center text-brand-yellow animate-spin text-3xs">O</div>
                      <span className="text-[10px] font-bold text-white">SECURED PROCTOR SCAN</span>
                      <span className="text-[8px] text-text-secondary uppercase">Candidate Feed Active</span>
                    </div>
                  )}

                  {/* Top indicator tag */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] text-white flex items-center gap-1 font-mono">
                      <span className={`w-1.5 h-1.5 rounded-full ${isHighRisk ? 'bg-status-danger animate-ping' : isMedRisk ? 'bg-status-warning animate-ping' : 'bg-status-success'}`} />
                      {riskLevel}
                    </span>
                  </div>

                  {/* Top right alerts tag */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {session.mockFaceStatus === 'multiple' && (
                      <span className="bg-status-danger/90 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                        MULTI-FACE
                      </span>
                    )}
                    {session.mockFaceStatus === 'movement' && (
                      <span className="bg-status-warning/90 text-bg-darkest text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-lg animate-pulse">
                        MOVING
                      </span>
                    )}
                    {session.mockFaceStatus === 'absent' && (
                      <span className="bg-status-danger/95 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-lg">
                        ABSENT
                      </span>
                    )}
                  </div>

                  {/* Bottom details overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] flex justify-between items-center text-white">
                    <span>Violations: <strong>{session.totalViolations ?? 0}</strong></span>
                    <span className="font-mono text-text-secondary font-bold">Score: <strong className={scoreColorClass}>{intScore}%</strong></span>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="p-4 flex flex-col gap-2 justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-sm text-white truncate">{session.studentName}</h3>
                    <span className="text-[10px] text-text-secondary block truncate mt-0.5">Attempting: {session.examTitle}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSession(session);
                    }}
                    className="w-full py-1.5 bg-white/5 border border-border-subtle hover:border-brand-yellow hover:text-brand-yellow text-4xs font-bold rounded transition-colors text-center"
                  >
                    Inspect Live Monitor
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔍 DETAILED ACTIVE MONITORING DRAWER PANEL */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-end z-50">
          <div className="w-full max-w-md h-full bg-bg-dark border-l border-border-subtle p-8 flex flex-col justify-between overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-4xs text-brand-yellow font-extrabold uppercase tracking-widest bg-brand-yellow/10 px-2.5 py-0.5 rounded border border-brand-yellow/20">
                  Live Feed Inspector
                </span>
                <h3 className="text-xl font-heading font-black text-white mt-2">{selectedSession.studentName}</h3>
                <span className="text-xs text-text-secondary mt-0.5 block">Session: {selectedSession.examTitle}</span>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-2 text-text-secondary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Snapshot display */}
            <div className="space-y-2">
              <span className="text-3xs font-extrabold uppercase text-text-secondary tracking-wider block">Live Webcam Feed Capture</span>
              <div className="relative aspect-video bg-bg-darkest rounded-xl border border-border-subtle overflow-hidden flex items-center justify-center">
                {selectedSession.latestFrame ? (
                  <img 
                    src={selectedSession.latestFrame} 
                    alt="Webcam frame snapshot" 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-center p-6 text-text-muted text-xs">
                    <span>Active Webcam Feed Secured</span>
                  </div>
                )}
                {/* Overlay details */}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[8px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  <span>Face scan: {selectedSession.mockFaceStatus ? selectedSession.mockFaceStatus.toUpperCase() : 'NORMAL'}</span>
                </div>
              </div>
            </div>

            {/* Proctor Indicators HUD */}
            <div className="space-y-2 bg-white/2 p-4 rounded-xl border border-border-subtle text-xs">
              <span className="text-[10px] text-text-secondary block font-bold uppercase tracking-wider">Telemetry Indicators</span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] text-text-muted block">Face Presence:</span>
                  <span className={`font-bold ${
                    selectedSession.mockFaceStatus === 'absent' 
                      ? 'text-status-danger' 
                      : selectedSession.mockFaceStatus === 'multiple'
                      ? 'text-status-danger'
                      : 'text-status-success'
                  }`}>
                    {selectedSession.mockFaceStatus === 'absent' 
                      ? '❌ Absent (No Face)' 
                      : selectedSession.mockFaceStatus === 'multiple'
                      ? '⚠️ Alert (Multiple)'
                      : '🟢 Detected (1 Face)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted block">Movement Level:</span>
                  <span className={`font-bold ${
                    selectedSession.mockFaceStatus === 'movement' ? 'text-status-warning animate-pulse' : 'text-text-secondary'
                  }`}>
                    {selectedSession.mockFaceStatus === 'movement' ? '⚠️ Excessive Movement' : 'Normal / Still'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted block">Security Risk Assessment:</span>
                  <span className={`font-extrabold uppercase ${
                    (selectedSession.integrityScore < 60 || selectedSession.finalRiskAssessment?.toLowerCase().includes('high'))
                      ? 'text-status-danger'
                      : selectedSession.integrityScore < 85
                      ? 'text-status-warning'
                      : 'text-status-success'
                  }`}>
                    {selectedSession.finalRiskAssessment || 'Low'} Risk
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted block">Active Alerts:</span>
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {selectedSession.mockFaceStatus === 'multiple' && (
                      <span className="px-1.5 py-0.5 rounded bg-status-danger/25 text-status-danger text-[8px] font-extrabold animate-pulse">
                        MULTI-FACE
                      </span>
                    )}
                    {selectedSession.mockFaceStatus === 'movement' && (
                      <span className="px-1.5 py-0.5 rounded bg-status-warning/25 text-status-warning text-[8px] font-extrabold animate-pulse">
                        MOVEMENT
                      </span>
                    )}
                    {selectedSession.mockFaceStatus === 'absent' && (
                      <span className="px-1.5 py-0.5 rounded bg-status-danger/25 text-status-danger text-[8px] font-extrabold">
                        FACE ABSENT
                      </span>
                    )}
                    {selectedSession.mockFaceStatus === 'normal' && (
                      <span className="px-1.5 py-0.5 rounded bg-status-success/25 text-status-success text-[8px] font-semibold">
                        SECURED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Session Stats HUD */}
            <div className="grid grid-cols-2 gap-4 bg-white/2 p-4 rounded-xl border border-border-subtle text-center text-xs">
              <div>
                <span className="text-[10px] text-text-secondary block font-bold uppercase">Integrity Score</span>
                <span className={`text-xl font-heading font-black mt-1 block ${
                  selectedSession.integrityScore < 60 ? 'text-status-danger' : selectedSession.integrityScore < 85 ? 'text-status-warning' : 'text-status-success'
                }`}>
                  {selectedSession.integrityScore}%
                </span>
              </div>
              <div className="border-l border-border-subtle">
                <span className="text-[10px] text-text-secondary block font-bold uppercase">Total Violations</span>
                <span className="text-xl font-heading font-black text-white mt-1 block">
                  {selectedSession.totalViolations ?? 0}
                </span>
              </div>
            </div>

            {/* Simulated Live alerts log */}
            <div className="space-y-3 flex-1 overflow-hidden">
              <span className="text-3xs font-extrabold uppercase text-text-secondary tracking-wider block">Real-time telemetry alert log</span>
              <div className="p-4 bg-white/2 border border-border-subtle rounded-xl max-h-[140px] overflow-y-auto space-y-2 text-3xs text-text-secondary">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white">Active Proctor connection</span>
                  <span>{new Date(selectedSession.lastUpdated).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white">Permissions checks validated</span>
                  <span>Lobby Verify</span>
                </div>
                {selectedSession.integrityScore < 90 && (
                  <div className="flex justify-between border-b border-white/5 pb-1 text-status-warning">
                    <span>Student session telemetry warnings logged</span>
                    <span>Audit Sync</span>
                  </div>
                )}
              </div>
            </div>

            {/* Force Terminate Panel controls */}
            <div className="border-t border-border-subtle pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Termination Verdict Details</label>
                <textarea 
                  rows={2}
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="Suspected exam cheating..."
                  className="w-full bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={() => handleForceTerminate(selectedSession.studentId, selectedSession.studentName)}
                className="w-full py-3 bg-status-danger text-white font-extrabold rounded-xl text-xs hover:opacity-90 shadow-lg flex items-center justify-center gap-1.5 transition-opacity"
              >
                <UserX className="w-4 h-4" /> Force-Terminate Exam Session
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
