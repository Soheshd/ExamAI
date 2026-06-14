"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Timer, Eye, AlertTriangle, ArrowLeft, ArrowRight, ShieldCheck, Flag, CheckSquare, Camera, Mic, Maximize, AlertCircle, Download } from 'lucide-react';

export default function ExamSessionPage({ params }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [examId, setExamId] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Route resolution
  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setExamId(resolved.id);
    }
    resolveParams();
  }, [params]);

  // --- STAGES STATE ---
  const [isStarted, setIsStarted] = useState(false);

  // --- LOBBY & PRE-EXAM CHECKS ---
  const [cameraPermission, setCameraPermission] = useState('checking'); // 'checking', 'granted', 'denied'
  const [micPermission, setMicPermission] = useState('checking'); // 'checking', 'granted', 'denied'
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [lobbyError, setLobbyError] = useState("");

  // --- EXAM PROGRESS STATE ---
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  // --- INTEGRITY & PROCTORING STATE ---
  const [integrityScore, setIntegrityScore] = useState(100);
  const [warningsCount, setWarningsCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);

  // Disconnect & Violation Counts
  const [cameraDisconnects, setCameraDisconnects] = useState(0);
  const [microphoneDisconnects, setMicrophoneDisconnects] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [minimizes, setMinimizes] = useState(0);
  const [noFaceCounts, setNoFaceCounts] = useState(0);
  const [multipleFacesCounts, setMultipleFacesCounts] = useState(0);
  const [refreshCounts, setRefreshCounts] = useState(0);
  
  // Continuous track states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  
  // Duration tracking for auto-actions
  const [cameraOffTime, setCameraOffTime] = useState(0);
  const [micOffTime, setMicOffTime] = useState(0);
  const [noFaceTime, setNoFaceTime] = useState(0);
  const [multipleFaceTime, setMultipleFaceTime] = useState(0);
  const [movementTime, setMovementTime] = useState(0);

  // Event timeline logs
  const [eventsLog, setEventsLog] = useState([]);

  // Mock face status for sandbox demonstration (normal, absent, multiple)
  const [mockFaceStatus, setMockFaceStatus] = useState('normal');

  // Submission Modal state
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Stream & Recorder references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const proctorTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const recordingDurationRestoredRef = useRef(0);

  // --- LOBBY PERMISSION CHECKS ---
  useEffect(() => {
    if (!examId) return;

    // Check if permissions already granted on page load
    requestPermissions(true);
  }, [examId]);

  const requestPermissions = async (silent = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');
      setMicPermission('granted');
      setIsCameraActive(true);
      setIsMicActive(false); // Wait to check audio tracks

      // Confirm audio track is active
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        setIsMicActive(true);
      }
      
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0 && videoTracks[0].enabled) {
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Failed to get media devices:', err);
      setCameraPermission('denied');
      setMicPermission('denied');
      if (!silent) {
        setLobbyError("Media devices access denied. Please allow camera and microphone permissions in your browser settings to continue.");
      }
    }
  };

  // Monitor Fullscreen status globally
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      setIsFullscreenActive(isFull);
      if (isStarted) {
        if (!isFull) {
          setShowFullscreenOverlay(true);
          logProctorViolation('Fullscreen Exit', 'Student exited fullscreen mode.');
          setFullscreenExits(prev => {
            const val = prev + 1;
            if (val > 3) {
              triggerAutoSubmit('Excessive Fullscreen Exits (> 3)');
            }
            return val;
          });
          setIntegrityScore(prev => Math.max(0, prev - 10));
        } else {
          setShowFullscreenOverlay(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isStarted]);

  // Request Fullscreen
  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreenActive(true);
      setShowFullscreenOverlay(false);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      setLobbyError("Fullscreen mode could not be activated automatically. Please double click the page or enable fullscreen manually.");
    }
  };

  // --- SAVE & RESTORE EXAM STATE (REFRESH PROTECTION) ---
  useEffect(() => {
    if (!examId || !isStarted) return;

    // Periodically save state to localStorage
    const saveState = () => {
      const currentSessionDuration = recordingStartTimeRef.current ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000) : 0;
      const totalRecordingDuration = (recordingDurationRestoredRef.current || 0) + currentSessionDuration;

      const stateObj = {
        answers,
        timeRemaining,
        currentIdx,
        flagged,
        cameraDisconnects,
        microphoneDisconnects,
        fullscreenExits,
        tabSwitches,
        minimizes,
        noFaceCounts,
        multipleFacesCounts,
        refreshCounts,
        integrityScore,
        eventsLog,
        isStarted,
        recordingDuration: totalRecordingDuration
      };
      localStorage.setItem(`examai_exam_state_${examId}`, JSON.stringify(stateObj));
    };

    const interval = setInterval(saveState, 2000);
    return () => clearInterval(interval);
  }, [
    examId, isStarted, answers, timeRemaining, currentIdx, flagged,
    cameraDisconnects, microphoneDisconnects, fullscreenExits, tabSwitches,
    minimizes, noFaceCounts, multipleFacesCounts, refreshCounts, integrityScore, eventsLog
  ]);

  // Load Exam and Check Restored State
  useEffect(() => {
    if (!examId) return;

    async function loadExam() {
      try {
        const targetExam = await db.getExam(examId);
        if (!targetExam) {
          alert('Exam not found.');
          router.push('/student');
          return;
        }
        setExam(targetExam);

        // Check if there is a saved state for this exam
        const savedStateStr = localStorage.getItem(`examai_exam_state_${examId}`);
        if (savedStateStr) {
          try {
            const savedState = JSON.parse(savedStateStr);
            if (savedState.isStarted) {
              // Restore student progress
              setAnswers(savedState.answers || {});
              setTimeRemaining(savedState.timeRemaining || targetExam.duration * 60);
              setCurrentIdx(savedState.currentIdx || 0);
              setFlagged(savedState.flagged || {});
              setCameraDisconnects(savedState.cameraDisconnects || 0);
              setMicrophoneDisconnects(savedState.microphoneDisconnects || 0);
              setFullscreenExits(savedState.fullscreenExits || 0);
              setTabSwitches(savedState.tabSwitches || 0);
              setMinimizes(savedState.minimizes || 0);
              setNoFaceCounts(savedState.noFaceCounts || 0);
              setMultipleFacesCounts(savedState.multipleFacesCounts || 0);
              const nextRefreshCount = (savedState.refreshCounts || 0) + 1;
              setRefreshCounts(nextRefreshCount);
              recordingDurationRestoredRef.current = savedState.recordingDuration || 0;
              
              // Deduct points for refresh
              const nextIntegrity = Math.max(0, (savedState.integrityScore || 100) - 15);
              setIntegrityScore(nextIntegrity);

              // Restore logs and add a refresh violation log
              const restoredLogs = savedState.eventsLog || [];
              const refreshEvent = {
                type: 'Page Refresh',
                timestamp: new Date().toISOString(),
                details: `Browser refresh detected. Restored exam state (Total Refreshes: ${nextRefreshCount}).`
              };
              const updatedLogs = [...restoredLogs, refreshEvent];
              setEventsLog(updatedLogs);
              setIsStarted(true);

              // Push the event immediately to db malpractice logs
              db.logMalpractice({
                examId,
                examTitle: targetExam.title,
                studentId: user?.id || 'usr-student',
                studentName: user?.name || 'Alex Johnson',
                type: 'Page Refresh',
                details: `Browser refresh detected. Restored state.`
              });

              // Alert warning message
              setWarningMessage("Incident Logged: Browser refresh detected. Point deduction applied.");
              setShowWarningBanner(true);
              setTimeout(() => setShowWarningBanner(false), 5000);

              // Set questions
              setQuestions(targetExam.questions);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Failed to parse saved exam state:', err);
          }
        }

        // Initialize normally
        setTimeRemaining(targetExam.duration * 60);
        // Randomize questions
        const shuffled = [...targetExam.questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId, router, user]);

  // Start recording helper
  const startRecording = async () => {
    if (!streamRef.current) return;

    recordingStartTimeRef.current = Date.now();

    // Try to load any previous recording from IndexedDB to concatenate (across refreshes)
    try {
      const { getLocalRecording } = await import('@/lib/indexedDb');
      const prevBlob = await getLocalRecording(user?.id || 'usr-student', examId);
      if (prevBlob && recordedChunksRef.current.length === 0) {
        recordedChunksRef.current = [prevBlob];
        console.log('ExamAI: Restored previous recording chunks from IndexedDB.', prevBlob.size);
      }
    } catch (err) {
      console.warn('Failed to restore previous recording chunks:', err);
    }

    try {
      const options = { mimeType: 'video/webm;codecs=vp8' };
      const recorder = new MediaRecorder(streamRef.current, options);
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          // Persist to IndexedDB in real time
          try {
            const { saveLocalRecording } = await import('@/lib/indexedDb');
            const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            await saveLocalRecording(user?.id || 'usr-student', examId, videoBlob);
          } catch (err) {
            console.error('Failed to save chunks to IndexedDB:', err);
          }
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // chunk every 1s
      console.log('ExamAI: Video Recording automatically started.');
    } catch (err) {
      console.warn('Failed to start MediaRecorder with codecs. Trying fallback...', err);
      try {
        const recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
            try {
              const { saveLocalRecording } = await import('@/lib/indexedDb');
              const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
              await saveLocalRecording(user?.id || 'usr-student', examId, videoBlob);
            } catch (err) {
              console.error('Failed to save fallback chunks to IndexedDB:', err);
            }
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        console.log('ExamAI: Video Recording started on fallback recorder.');
      } catch (err2) {
        console.error('MediaRecorder completely unsupported:', err2);
      }
    }
  };

  // Automatically restart recording if exam is active but recorder is not running (e.g., after refresh)
  useEffect(() => {
    if (isStarted && streamRef.current && !mediaRecorderRef.current) {
      console.log('ExamAI: Active session and stream detected. Starting/resuming recording.');
      startRecording();
    }
  }, [isStarted, streamRef.current]);

  // Start Exam trigger & Recording
  const handleStartExam = () => {
    if (!isCameraActive || !isMicActive) {
      setLobbyError("Please ensure both your camera and microphone are connected and active.");
      return;
    }
    if (!isFullscreenActive) {
      setLobbyError("Please enable full-screen mode to begin.");
      return;
    }

    setIsStarted(true);
    setEventsLog([{
      type: 'Exam Started',
      timestamp: new Date().toISOString(),
      details: 'Examination session initiated.'
    }]);

    recordedChunksRef.current = [];
    startRecording();
  };

  // Stop recording and return the storage upload URL with size and timestamp metadata
  const stopAndUploadRecording = () => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      
      const compileResult = async () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const size = videoBlob.size;
        const timestamp = new Date().toISOString();
        const available = size > 100;
        
        // Calculate total duration
        const currentSessionDuration = recordingStartTimeRef.current ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000) : 0;
        const duration = (recordingDurationRestoredRef.current || 0) + currentSessionDuration;
        
        console.log('ExamAI: Compiling recording metadata. Size:', size, 'Duration:', duration);
        try {
          const url = await db.uploadRecording(user?.id || 'usr-student', examId, videoBlob);
          return { url, size, timestamp, available, duration };
        } catch (err) {
          console.error('Recording upload failed:', err);
          return { url: '', size, timestamp, available, duration };
        }
      };

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = async () => {
          const res = await compileResult();
          resolve(res);
        };
        recorder.stop();
      } else {
        compileResult().then(resolve);
      }
    });
  };

  // --- PHASE 2 – LIVE MONITORING SNAPSHOT YIELD ---
  useEffect(() => {
    if (!isStarted || loading || !exam) return;

    const syncSession = async () => {
      let frameData = '';
      if (canvasRef.current) {
        // Grab compressed JPEG snapshot from the proctoring canvas
        frameData = canvasRef.current.toDataURL('image/jpeg', 0.4);
      }

      let risk = 'Low';
      if (integrityScore < 60) risk = 'High';
      else if (integrityScore < 85) risk = 'Medium';

      try {
        const session = await db.updateActiveSession(user?.id || 'usr-student', {
          studentName: user?.name || 'Alex Johnson',
          examId,
          examTitle: exam.title,
          integrityScore,
          finalRiskAssessment: risk,
          totalViolations: warningsCount,
          latestFrame: frameData,
          mockFaceStatus,
          faceDetected: mockFaceStatus === 'normal' || mockFaceStatus === 'movement',
          multipleFacesDetected: mockFaceStatus === 'multiple',
          excessiveMovementDetected: mockFaceStatus === 'movement'
        });

        // Listen for Teacher force-termination calls
        if (session && session.forceTerminated) {
          triggerAutoSubmit(session.terminationReason || 'Force terminated by proctor administrator.');
        }
      } catch (err) {
        console.error('Active session sync failed:', err);
      }
    };

    const syncInterval = setInterval(syncSession, 3000);
    syncSession(); // Initial sync

    return () => {
      clearInterval(syncInterval);
      db.deleteActiveSession(user?.id || 'usr-student').catch(err => console.error(err));
    };
  }, [isStarted, loading, exam, integrityScore, warningsCount, mockFaceStatus, user]);

  // --- LIVE PROCTORING MONITORING ---
  useEffect(() => {
    if (!isStarted || loading || !exam) return;

    // 1. Timer Countdown and Close Window Check
    timerRef.current = setInterval(() => {
      const now = new Date();
      if (now > new Date(exam.closeAt)) {
        clearInterval(timerRef.current);
        if (proctorTimerRef.current) clearInterval(proctorTimerRef.current);
        alert('The scheduled examination close time has been reached. Auto-submitting answers now.');
        submitExam();
        return;
      }

      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          alert('Time has expired! Submitting your answers automatically.');
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Tab Blur / Focus Loss / Minimize Event Listeners
    const handleWindowBlur = () => {
      logProctorViolation('Tab Switch / Focus Loss', 'Student navigated away from the exam workspace.');
      setTabSwitches(prev => {
        const val = prev + 1;
        if (val > 3) {
          triggerAutoSubmit('Excessive Tab Switching (> 3)');
        }
        return val;
      });
      setIntegrityScore(prev => Math.max(0, prev - 10));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logProctorViolation('Window Minimize', 'Student minimized the examination window.');
        setMinimizes(prev => prev + 1);
        setIntegrityScore(prev => Math.max(0, prev - 10));
      }
    };

    // Prevent right clicks (exam security)
    const handleContextMenu = (e) => e.preventDefault();

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    // 3. Proctoring Tracks Check & Durations Counter (Every 1 second)
    proctorTimerRef.current = setInterval(() => {
      // Check active tracks
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        const audioTrack = streamRef.current.getAudioTracks()[0];

        const camActive = !!(videoTrack && videoTrack.enabled && videoTrack.readyState === 'live');
        const micActive = !!(audioTrack && audioTrack.enabled && audioTrack.readyState === 'live');

        setIsCameraActive(camActive);
        setIsMicActive(micActive);

        // Camera track Off check
        if (!camActive) {
          setCameraDisconnects(prev => prev + 1);
          setIntegrityScore(prev => Math.max(0, prev - 15));
          logProctorViolation('Camera Disconnect', 'Webcam track disabled or disconnected.');
          setCameraOffTime(prev => {
            const nextVal = prev + 1;
            if (nextVal >= 30) {
              triggerAutoSubmit('Camera inactive for > 30 seconds.');
            }
            return nextVal;
          });
        } else {
          setCameraOffTime(0);
        }

        // Microphone track Off check
        if (!micActive) {
          setMicrophoneDisconnects(prev => prev + 1);
          setIntegrityScore(prev => Math.max(0, prev - 15));
          logProctorViolation('Microphone Mute', 'Microphone track disabled or muted.');
          setMicOffTime(prev => {
            const nextVal = prev + 1;
            if (nextVal >= 30) {
              triggerAutoSubmit('Microphone inactive for > 30 seconds.');
            }
            return nextVal;
          });
        } else {
          setMicOffTime(0);
        }
      }

      // Check simulated face status durations
      if (mockFaceStatus === 'absent') {
        setNoFaceTime(prev => {
          const nextVal = prev + 1;
          if (nextVal === 15) {
            setWarningMessage("Warning: No face detected. Please return to the screen immediately.");
            setShowWarningBanner(true);
            setTimeout(() => setShowWarningBanner(false), 5000);
          } else if (nextVal === 30) {
            setNoFaceCounts(c => c + 1);
            setIntegrityScore(prevScore => Math.max(0, prevScore - 10));
            logProctorViolation('No Face Detected', 'Visual scan detected zero faces on webcam feed for more than 30 seconds.');
          } else if (nextVal >= 60) {
            triggerAutoSubmit('No face detected for more than 60 seconds.');
          }
          return nextVal;
        });
      } else {
        setNoFaceTime(0);
      }

      if (mockFaceStatus === 'multiple') {
        setMultipleFaceTime(prev => {
          const nextVal = prev + 1;
          if (nextVal >= 15) {
            triggerAutoSubmit('Multiple faces detected for more than 15 seconds.');
          }
          return nextVal;
        });
      } else {
        setMultipleFaceTime(0);
      }

      if (mockFaceStatus === 'movement') {
        setMovementTime(prev => {
          const nextVal = prev + 1;
          if (nextVal % 5 === 0) {
            setIntegrityScore(prevScore => Math.max(0, prevScore - 5));
            logProctorViolation('Excessive Movement', 'Student exhibited excessive movement relative to normal face position.');
          } else {
            setWarningMessage("Warning: Excessive body movement detected. Please remain still.");
            setShowWarningBanner(true);
          }
          return nextVal;
        });
      } else {
        setMovementTime(0);
      }
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(proctorTimerRef.current);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isStarted, loading, exam, mockFaceStatus]);

  // Handle Mock Face Status triggers
  const changeMockFaceStatus = (status) => {
    setMockFaceStatus(status);
    if (status === 'absent') {
      // Allow interval to count duration for warnings, violation log at 30s, auto-submit at 60s
    } else if (status === 'multiple') {
      setIntegrityScore(prev => Math.max(0, prev - 15));
      logProctorViolation('Multiple Faces Detected', 'Immediate high-severity warning: Multiple faces detected in webcam feed.');
      setMultipleFacesCounts(prev => {
        const nextVal = prev + 1;
        if (nextVal >= 3) {
          triggerAutoSubmit('Repeated multiple-face events detected.');
        }
        return nextVal;
      });
    } else if (status === 'movement') {
      setWarningMessage("Warning: Excessive movement detected. Please remain still.");
      setShowWarningBanner(true);
      setTimeout(() => setShowWarningBanner(false), 5500);
    }
  };

  // Helper to log proctor violations
  const logProctorViolation = (type, details) => {
    setWarningsCount(prev => prev + 1);
    setWarningMessage(`Violation Detected: ${type} - ${details}`);
    setShowWarningBanner(true);
    setTimeout(() => setShowWarningBanner(false), 5500);

    const event = {
      type,
      timestamp: new Date().toISOString(),
      details
    };
    setEventsLog(prev => [...prev, event]);

    // Send immediately to db malpractice logging
    db.logMalpractice({
      examId,
      examTitle: exam?.title,
      studentId: user?.id || 'usr-student',
      studentName: user?.name || 'Alex Johnson',
      type,
      details
    });
  };

  // Trigger auto-submit when violations reach limits
  const triggerAutoSubmit = async (reason) => {
    clearInterval(timerRef.current);
    clearInterval(proctorTimerRef.current);

    // Stop recording and upload
    const recordingInfo = await stopAndUploadRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    // Save malpractice submission
    const resultDoc = {
      examId: examId,
      examTitle: exam.title,
      studentId: user?.id || 'usr-student',
      studentName: user?.name || 'Alex Johnson',
      subject: exam.subject,
      score: 0,
      totalMarks: exam.totalMarks,
      percentage: 0,
      passed: false,
      timestamp: new Date().toISOString(),
      responses: answers,
      weakArea: 'Malpractice Auto-Submit',
      feedbacks: `Examination auto-submitted due to proctoring violation limits: ${reason}`,
      reviewRequired: true,
      proctoringReport: {
        studentName: user?.name || 'Alex Johnson',
        examTitle: exam.title,
        totalViolations: warningsCount + 1,
        cameraDisconnectCount: cameraDisconnects,
        microphoneDisconnectCount: microphoneDisconnects,
        fullscreenExitCount: fullscreenExits,
        tabSwitchCount: tabSwitches,
        minimizeCount: minimizes,
        noFaceCount: noFaceCounts,
        multipleFacesCount: multipleFacesCounts,
        refreshCount: refreshCounts,
        integrityScore: 0,
        finalRiskAssessment: 'High (Auto-Malpractice)',
        reviewRequired: true,
        malpracticeSubmitted: true,
        autoSubmitReason: reason,
        recordingUrl: recordingInfo.url,
        recordingMetadata: {
          studentName: user?.name || 'Alex Johnson',
          studentId: user?.id || 'usr-student',
          examId: examId,
          examName: exam.title,
          recordingAvailable: recordingInfo.available,
          recordingDuration: recordingInfo.duration,
          recordingSize: recordingInfo.size,
          recordingTimestamp: recordingInfo.timestamp
        },
        startTime: eventsLog[0]?.timestamp || new Date().toISOString(),
        endTime: new Date().toISOString(),
        events: [...eventsLog, { type: 'Auto-Submit Triggered', timestamp: new Date().toISOString(), details: reason }]
      }
    };

    try {
      await db.saveResult(resultDoc);
      // Delete active session
      await db.deleteActiveSession(user?.id || 'usr-student');
      // Clean storage state
      localStorage.removeItem(`examai_exam_state_${examId}`);
      
      setSubmissionResult({
        score: 0,
        totalMarks: exam.totalMarks,
        passed: false,
        percentage: 0,
        isAutoSubmit: true,
        reason: reason
      });
      setShowSubmissionModal(true);
    } catch (err) {
      alert(`Auto-submit failure: ${err.message}`);
    }
  };

  // Submit Exam manually
  const submitExam = async () => {
    clearInterval(timerRef.current);
    clearInterval(proctorTimerRef.current);

    // Stop recording and upload
    const recordingInfo = await stopAndUploadRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    // Calculate grades
    let score = 0;
    const breakdown = [];
    
    questions.forEach((q) => {
      const ans = answers[q.id] || '';
      let earned = 0;

      if (q.type === 'mcq') {
        if (ans === q.answer) {
          earned = q.marks;
        }
        breakdown.push({ topic: 'Conceptual MCQ', score: earned, total: q.marks });
      } else {
        const textLen = ans.trim().length;
        if (textLen > 150) earned = q.marks;
        else if (textLen > 50) earned = Math.round(q.marks * 0.7);
        else if (textLen > 5) earned = Math.round(q.marks * 0.3);

        breakdown.push({ topic: q.type === 'short' ? 'Short Answer' : 'Long Essay Analysis', score: earned, total: q.marks });
      }

      score += earned;
    });

    const percentage = Math.round((score / exam.totalMarks) * 100);
    const passed = percentage >= 50 && integrityScore >= 60; // fail if integrity score drops below 60%

    // Weakness identification
    let weakArea = 'Conceptual Foundations';
    const weakItem = breakdown.sort((a,b) => (a.score/a.total) - (b.score/b.total))[0];
    if (weakItem && weakItem.score < weakItem.total) {
      weakArea = `${weakItem.topic} (${exam.subject})`;
    }

    // Determine Risk Level & malpractice
    let riskLevel = 'Low';
    if (integrityScore < 60) riskLevel = 'High';
    else if (integrityScore < 85) riskLevel = 'Medium';

    const reviewRequired = integrityScore < 60 || warningsCount > 5;

    const resultDoc = {
      examId: examId,
      examTitle: exam.title,
      studentId: user?.id || 'usr-student',
      studentName: user?.name || 'Alex Johnson',
      subject: exam.subject,
      score: score,
      totalMarks: exam.totalMarks,
      percentage: percentage,
      passed: passed,
      timestamp: new Date().toISOString(),
      responses: answers,
      topicBreakdown: breakdown,
      weakArea: weakArea,
      feedbacks: passed ? 'Good analytical capacity. Keep it up.' : 'Needs revision of syntax and writing formats.',
      reviewRequired: reviewRequired,
      proctoringReport: {
        studentName: user?.name || 'Alex Johnson',
        examTitle: exam.title,
        totalViolations: warningsCount,
        cameraDisconnectCount: cameraDisconnects,
        microphoneDisconnectCount: microphoneDisconnects,
        fullscreenExitCount: fullscreenExits,
        tabSwitchCount: tabSwitches,
        minimizeCount: minimizes,
        noFaceCount: noFaceCounts,
        multipleFacesCount: multipleFacesCounts,
        refreshCount: refreshCounts,
        integrityScore: integrityScore,
        finalRiskAssessment: riskLevel,
        reviewRequired: reviewRequired,
        malpracticeSubmitted: false,
        recordingUrl: recordingInfo.url,
        recordingMetadata: {
          studentName: user?.name || 'Alex Johnson',
          studentId: user?.id || 'usr-student',
          examId: examId,
          examName: exam.title,
          recordingAvailable: recordingInfo.available,
          recordingDuration: recordingInfo.duration,
          recordingSize: recordingInfo.size,
          recordingTimestamp: recordingInfo.timestamp
        },
        startTime: eventsLog[0]?.timestamp || new Date().toISOString(),
        endTime: new Date().toISOString(),
        events: eventsLog
      }
    };

    try {
      await db.saveResult(resultDoc);
      // Delete active session
      await db.deleteActiveSession(user?.id || 'usr-student');
      // Clean storage state
      localStorage.removeItem(`examai_exam_state_${examId}`);
      
      // Save weak area to study planner
      const plan = await db.getStudyPlan(user?.id || 'usr-student') || { studentId: user?.id || 'usr-student', weeklySchedule: [], recommendations: [] };
      plan.recommendations.push(`Revise ${weakArea} on ${exam.subject} to address exam weakness.`);
      await db.saveStudyPlan(user?.id || 'usr-student', plan);

      setSubmissionResult({
        score: score,
        totalMarks: exam.totalMarks,
        passed: passed,
        percentage: percentage,
        isAutoSubmit: false,
        reason: ''
      });
      setShowSubmissionModal(true);
    } catch (err) {
      alert(`Failed to save results: ${err.message}`);
    }
  };

  const handleFinishClick = () => {
    if (confirm('Are you ready to submit your exam? All responses are saved.')) {
      submitExam();
    }
  };

  // --- DRAW SIMULATED WEBCAM FRAMES & BOUNDING BOX OVERLAYS ---
  useEffect(() => {
    if (!isStarted || loading || !exam) return;
    let animId;
    const ctx = canvasRef.current?.getContext('2d');
    const video = videoRef.current;
    
    const drawFrame = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      
      // Draw video feed (flipped mirror)
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -width, 0, width, height);
        ctx.restore();
      } else {
        // Draw black background placeholder
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('WEBCAM SECURED', width / 2 - 45, height / 2);
      }
      
      // Draw green/red bounding box simulation overlays on webcam feed
      if (isCameraActive) {
        if (mockFaceStatus === 'normal') {
          // Green box around center face
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(width / 2 - 40, height / 2 - 45, 80, 90);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('FACE DETECTED [ID: 01]', width / 2 - 40, height / 2 - 50);
          
          // Subtle target sights
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(width / 2 - 60, height / 2 - 65, 120, 130);
        } else if (mockFaceStatus === 'multiple') {
          // Two red boxes
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          // Box 1
          ctx.strokeRect(width / 2 - 70, height / 2 - 40, 55, 75);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('FACE 01 (STUDENT)', width / 2 - 70, height / 2 - 45);
          // Box 2
          ctx.strokeRect(width / 2 + 10, height / 2 - 30, 50, 65);
          ctx.fillText('FACE 02 (INTRUDER)', width / 2 + 10, height / 2 - 35);
          
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
          ctx.fillRect(0, 0, width, height);
        } else if (mockFaceStatus === 'absent') {
          // Yellow target box with warning text
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(width / 2 - 40, height / 2 - 45, 80, 90);
          ctx.setLineDash([]);
          
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⚠️ NO FACE DETECTED', width / 2 - 45, height / 2);
          
          ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
          ctx.fillRect(0, 0, width, height);
        } else if (mockFaceStatus === 'movement') {
          // Orange jittery box
          const jitterX = Math.sin(Date.now() / 50) * 8;
          const jitterY = Math.cos(Date.now() / 50) * 8;
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.strokeRect(width / 2 - 40 + jitterX, height / 2 - 45 + jitterY, 80, 90);
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('⚠️ EXCESSIVE MOVEMENT', width / 2 - 45 + jitterX, height / 2 - 50 + jitterY);
          
          ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
          ctx.fillRect(0, 0, width, height);
        }
      }
      
      animId = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
    return () => cancelAnimationFrame(animId);
  }, [isStarted, loading, exam, isCameraActive, mockFaceStatus]);

  if (loading || !exam) {
    return <div className="min-h-screen bg-bg-darkest flex items-center justify-center text-text-secondary text-sm">Locking exam database configurations...</div>;
  }

  // --- LOBBY VIEW (PRE-EXAM VERIFICATION SCREEN) ---
  if (!isStarted) {
    const now = new Date();
    const pubTime = new Date(exam.publishAt).getTime();
    const closeTime = new Date(exam.closeAt).getTime();
    const nowTime = now.getTime();

    const isBeforePublish = nowTime < pubTime;
    const isAfterClose = nowTime > closeTime;

    if (isBeforePublish || isAfterClose) {
      return (
        <div className="min-h-screen bg-bg-darkest text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md glass-card p-8 border-brand-yellow glow-yellow space-y-6 text-center">
            <div className="bg-status-danger/10 border border-status-danger/25 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-status-danger">
              <AlertCircle className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-heading font-black text-white">
                {isBeforePublish ? 'Examination Scheduled' : 'Examination Closed'}
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                {isBeforePublish 
                  ? `This examination is not yet available for attempts.` 
                  : 'This examination has closed and is no longer accepting submissions.'}
              </p>
            </div>

            <div className="p-4 bg-white/2 border border-border-subtle rounded-xl text-left space-y-2 text-xs">
              <div>
                <span className="text-text-muted">Start Window: </span>
                <span className="font-bold text-white">{db.formatDateTime12H(exam.publishAt)}</span>
              </div>
              <div>
                <span className="text-text-muted">Close Window: </span>
                <span className="font-bold text-white">{db.formatDateTime12H(exam.closeAt)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/student')}
              className="w-full py-3 bg-brand-yellow text-bg-darkest font-extrabold rounded-xl text-xs hover:opacity-90 shadow-yellow-glow transition-all"
            >
              Return to Student Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-bg-darkest text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl glass-card p-8 border-brand-yellow glow-yellow space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs text-brand-yellow font-extrabold uppercase tracking-widest bg-brand-yellow/10 px-3 py-1 rounded-full border border-brand-yellow/20">
              ExamAI Security Protocol
            </span>
            <h1 className="text-3xl font-heading font-black text-white">Permission & Validation Lobby</h1>
            <p className="text-sm text-text-secondary max-w-lg mx-auto">
              You must verify your identity and environment checks before starting <strong>{exam.title}</strong>.
            </p>
          </div>

          {lobbyError && (
            <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-xs text-status-danger flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{lobbyError}</span>
            </div>
          )}

          {/* Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Camera */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between items-center text-center gap-3 transition-colors ${
              cameraPermission === 'granted' ? 'bg-status-success/5 border-status-success/30' : 'bg-white/2 border-border-subtle'
            }`}>
              <Camera className={`w-8 h-8 ${cameraPermission === 'granted' ? 'text-status-success' : 'text-text-secondary'}`} />
              <div>
                <span className="block font-bold text-xs">Webcam Scan</span>
                <span className="text-[10px] text-text-secondary">
                  {cameraPermission === 'granted' ? 'Camera Authorized' : 'Permission Required'}
                </span>
              </div>
              {cameraPermission !== 'granted' && (
                <button 
                  onClick={() => requestPermissions(false)}
                  className="px-3 py-1.5 bg-white/5 border border-border-subtle hover:border-brand-yellow text-[10px] rounded font-semibold transition-colors"
                >
                  Enable Camera
                </button>
              )}
            </div>

            {/* Microphone */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between items-center text-center gap-3 transition-colors ${
              micPermission === 'granted' ? 'bg-status-success/5 border-status-success/30' : 'bg-white/2 border-border-subtle'
            }`}>
              <Mic className={`w-8 h-8 ${micPermission === 'granted' ? 'text-status-success' : 'text-text-secondary'}`} />
              <div>
                <span className="block font-bold text-xs">Audio Monitor</span>
                <span className="text-[10px] text-text-secondary">
                  {micPermission === 'granted' ? 'Microphone Authorized' : 'Permission Required'}
                </span>
              </div>
              {micPermission !== 'granted' && (
                <button 
                  onClick={() => requestPermissions(false)}
                  className="px-3 py-1.5 bg-white/5 border border-border-subtle hover:border-brand-yellow text-[10px] rounded font-semibold transition-colors"
                >
                  Enable Mic
                </button>
              )}
            </div>

            {/* Full Screen */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between items-center text-center gap-3 transition-colors ${
              isFullscreenActive ? 'bg-status-success/5 border-status-success/30' : 'bg-white/2 border-border-subtle'
            }`}>
              <Maximize className={`w-8 h-8 ${isFullscreenActive ? 'text-status-success' : 'text-text-secondary'}`} />
              <div>
                <span className="block font-bold text-xs">Screen Lock</span>
                <span className="text-[10px] text-text-secondary">
                  {isFullscreenActive ? 'Fullscreen Enforced' : 'Window Enforcing Required'}
                </span>
              </div>
              {!isFullscreenActive && (
                <button 
                  onClick={enterFullscreen}
                  className="px-3 py-1.5 bg-brand-yellow text-bg-darkest font-bold text-[10px] rounded hover:opacity-90 transition-opacity"
                >
                  Lock Full-Screen
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-6 flex flex-col gap-4">
            {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_AVAILABLE === 'false' && (
              <div className="p-3.5 bg-status-warning/10 border border-status-warning/25 rounded-xl text-left space-y-1">
                <div className="flex items-center gap-2 text-status-warning font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cloud recording storage is unavailable. Local recording mode is active.</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Due to Firebase Storage limits, your proctoring video will be securely saved in your browser's local database (IndexedDB). You will be prompted to download the file upon submission.
                </p>
              </div>
            )}

            {/* Warning Message if checks aren't satisfied */}
            {!(isCameraActive && isMicActive && isFullscreenActive) && (
              <p className="text-2xs text-status-warning bg-status-warning/10 border border-status-warning/20 p-3 rounded-lg text-center font-semibold">
                ⚠️ Camera, Microphone, and Full-Screen access are mandatory to begin the examination.
              </p>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => router.push('/student')}
                className="px-5 py-3 border border-border-subtle rounded-xl text-xs font-semibold hover:bg-white/5 transition-colors"
              >
                Abort Test
              </button>
              <button
                onClick={handleStartExam}
                disabled={!(cameraPermission === 'granted' && micPermission === 'granted' && isFullscreenActive)}
                className="flex-1 py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-extrabold rounded-xl text-xs text-center shadow-yellow-glow disabled:opacity-40 disabled:pointer-events-none hover:opacity-95 transition-all"
              >
                Start Secured Examination
              </button>
            </div>
          </div>
        </div>

        {/* Hidden video element to read raw tracks */}
        <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      </div>
    );
  }

  // --- WORKSPACE CORE VARIABLES ---
  const currentQuestion = questions[currentIdx];
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Integrity details helpers
  let riskColor = 'text-status-success';
  let riskBg = 'bg-status-success/15';
  let riskText = 'Low Risk';
  if (integrityScore < 60) {
    riskColor = 'text-status-danger';
    riskBg = 'bg-status-danger/15';
    riskText = 'High Risk';
  } else if (integrityScore < 85) {
    riskColor = 'text-status-warning';
    riskBg = 'bg-status-warning/15';
    riskText = 'Medium Risk';
  }

  if (showSubmissionModal) {
    const isStorageUnavailable = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_AVAILABLE === 'false';
    const hasRecording = recordedChunksRef.current.length > 0;

    const handleDownloadLocalWebm = () => {
      if (recordedChunksRef.current.length === 0) {
        alert("No recording data available to download.");
        return;
      }
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ExamAI_Recording_${exam.title.replace(/\s+/g, '_')}_${user?.name?.replace(/\s+/g, '_') || 'Student'}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };

    return (
      <div className="min-h-screen bg-bg-darkest text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl glass-card p-8 border-brand-yellow glow-yellow space-y-6 text-center">
          <div className="bg-status-success/10 border border-status-success/30 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-status-success">
            <ShieldCheck className="w-12 h-12" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-heading font-black text-white">
              {submissionResult?.isAutoSubmit ? 'Secured Session Terminated' : 'Examination Submitted'}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              {submissionResult?.isAutoSubmit 
                ? `Your exam has been submitted automatically: ${submissionResult.reason}`
                : 'Your response sheet and proctoring telemetry data have been successfully recorded.'}
            </p>
          </div>

          {isStorageUnavailable && (
            <div className="p-4 bg-status-warning/10 border border-status-warning/25 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2 text-status-warning font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Cloud recording storage is unavailable. Local recording mode is active.</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Because this workspace is running on the Firebase Spark plan, your video proctoring session was saved directly in your browser's local database (IndexedDB). Please download a copy for your records.
              </p>
            </div>
          )}

          {hasRecording ? (
            <div className="p-5 bg-white/2 border border-border-subtle rounded-xl flex flex-col items-center gap-3">
              <span className="text-2xs font-extrabold uppercase text-text-secondary tracking-widest">Webcam Session Recording</span>
              <button
                onClick={handleDownloadLocalWebm}
                className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-extrabold rounded-xl text-xs hover:opacity-90 shadow-yellow-glow flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download Webcam Recording (.webm)
              </button>
              <span className="text-[10px] text-text-muted">
                Recording Size: {(new Blob(recordedChunksRef.current).size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          ) : (
            <div className="p-5 bg-white/2 border border-border-subtle rounded-xl text-text-muted text-xs">
              No webcam recording data found.
            </div>
          )}

          <button
            onClick={() => {
              if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              router.push('/student');
            }}
            className="w-full py-3 border border-border-subtle hover:bg-white/5 font-bold rounded-xl text-xs transition-colors"
          >
            Finish & Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-darkest text-white flex flex-col relative">
      
      {/* ⚠️ REAL-TIME VIOLATION WARNING BANNER */}
      {showWarningBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-status-danger border-2 border-white/20 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce max-w-xl text-center">
          <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          <span className="font-bold text-xs text-white">{warningMessage}</span>
        </div>
      )}

      {/* 🔒 MANDATORY FULL-SCREEN BLOCKED OVERLAY */}
      {showFullscreenOverlay && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6">
          <div className="max-w-md text-center space-y-6">
            <div className="bg-status-danger/10 border border-status-danger/25 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-status-danger animate-pulse">
              <Maximize className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-black text-white">Full-Screen Mode Required</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Examination workspace security requires exclusive screen focus. Re-enter Fullscreen mode immediately to resume.
              </p>
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full py-3 bg-brand-yellow text-bg-darkest font-black rounded-xl text-xs hover:opacity-90 shadow-yellow-glow transition-all"
            >
              Restore Full-Screen Workspace
            </button>
          </div>
        </div>
      )}

      {/* Locked Header */}
      <header className="px-6 py-4 bg-bg-dark border-b border-border-subtle flex justify-between items-center select-none">
        <div className="flex items-center gap-3">
          <div className="bg-brand-yellow text-bg-darkest w-7 h-7 rounded flex items-center justify-center font-bold text-sm">E</div>
          <span className="font-semibold text-sm">Secured Exam Workspace: <span className="text-text-secondary">{exam.title}</span></span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/3 border border-border-subtle px-4 py-1.5 rounded-full">
            <Timer className="w-4 h-4 text-brand-yellow animate-pulse" />
            <span className="font-mono text-sm font-extrabold text-brand-yellow">{formatTime(timeRemaining)}</span>
          </div>

          <button 
            onClick={handleFinishClick}
            className="px-4 py-2 bg-status-danger text-white font-bold rounded-lg text-xs hover:opacity-90 transition-all shadow-lg"
          >
            Submit Examination
          </button>
        </div>
      </header>

      {/* Persistent warning banner if cloud storage is unavailable */}
      {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_AVAILABLE === 'false' && (
        <div className="bg-status-warning/15 border-b border-status-warning/20 px-6 py-2 flex items-center justify-between text-2xs text-status-warning select-none">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Cloud recording storage is unavailable. Local recording mode is active.</span>
          </div>
          <span className="font-mono text-3xs opacity-85">IndexedDB local storage: Active</span>
        </div>
      )}

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side Workspace */}
        <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
          {currentQuestion ? (
            <div className="space-y-6 max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-center text-xs text-text-secondary border-b border-border-subtle pb-2">
                <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
                <span className="font-bold text-brand-yellow uppercase tracking-wider">{currentQuestion.marks} Marks</span>
              </div>

              <h2 className="text-xl font-bold leading-relaxed">{currentQuestion.text}</h2>

              {/* Input Forms based on type */}
              <div className="pt-4">
                {currentQuestion.type === 'mcq' ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt }))}
                          className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            isSelected 
                              ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' 
                              : 'bg-bg-dark border-border-subtle hover:bg-white/3'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-brand-yellow text-bg-darkest' : 'bg-white/5 text-text-secondary'
                          }`}>{letter}</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={currentQuestion.type === 'long' ? 10 : 5}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                      placeholder="Type your structured academic response here..."
                      className="w-full bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors leading-relaxed"
                    />
                    <span className="text-3xs text-text-secondary block text-right">Answers are auto-saved. Keep typing.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary">No questions loaded.</div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-8 border-t border-border-subtle max-w-3xl mx-auto w-full mt-auto">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 bg-white/5 border border-border-subtle rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <button
              onClick={() => setFlagged(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
              className={`px-4 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                flagged[currentQuestion.id] 
                  ? 'border-brand-yellow text-brand-yellow bg-brand-yellow/5' 
                  : 'border-border-subtle hover:bg-white/5 text-text-secondary'
              }`}
            >
              <Flag className="w-4 h-4" /> Flag for Review
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="px-4 py-2 bg-brand-yellow text-bg-darkest font-bold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-yellow-glow"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishClick}
                className="px-4 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-yellow-glow"
              >
                Finish Test
              </button>
            )}
          </div>
        </div>

        {/* Right side Proctor & Sheet Grid */}
        <aside className="w-80 bg-bg-dark border-l border-border-subtle p-6 flex flex-col gap-6 overflow-y-auto shrink-0 select-none">
          
          {/* Real-Time Integrity Panel */}
          <div className="p-4 bg-white/3 border border-border-subtle rounded-xl space-y-3">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Real-Time Integrity</span>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-3xl font-heading font-black text-white">{integrityScore}%</span>
                <span className="block text-4xs text-text-muted mt-0.5">Integrity Score</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-4xs font-extrabold uppercase tracking-wide ${riskBg} ${riskColor}`}>
                {riskText}
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  integrityScore < 60 ? 'bg-status-danger' : integrityScore < 85 ? 'bg-status-warning' : 'bg-status-success'
                }`}
                style={{ width: `${integrityScore}%` }}
              />
            </div>
          </div>

          {/* Webcam Canvas Feed */}
          <div className="space-y-2">
            <span className="text-3xs font-extrabold uppercase text-text-secondary tracking-wider flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-brand-yellow" /> AI Proctor Monitor Feed
            </span>
            <div className="relative aspect-video bg-bg-darkest rounded-xl border border-border-subtle overflow-hidden flex items-center justify-center">
              <canvas 
                ref={canvasRef}
                width={272}
                height={204}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Live Indicators */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[9px] text-center">
              <div className={`py-1 rounded border ${isCameraActive ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-status-danger/10 border-status-danger/20 text-status-danger'}`}>
                CAM {isCameraActive ? '🟢' : '🔴'}
              </div>
              <div className={`py-1 rounded border ${isMicActive ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-status-danger/10 border-status-danger/20 text-status-danger'}`}>
                MIC {isMicActive ? '🟢' : '🔴'}
              </div>
              <div className={`py-1 rounded border ${isFullscreenActive ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-status-danger/10 border-status-danger/20 text-status-danger'}`}>
                FULL {isFullscreenActive ? '🟢' : '🔴'}
              </div>
            </div>
          </div>

          {/* DEMO PROCTOR CONTROLLERS */}
          <div className="p-3 bg-brand-yellow/5 border border-brand-yellow/15 rounded-xl space-y-2">
            <span className="text-4xs font-bold text-brand-yellow uppercase tracking-wider block">Demo Proctor Simulators</span>
            <div className="grid grid-cols-2 gap-1">
              <button 
                onClick={() => changeMockFaceStatus('normal')}
                className={`py-1 rounded text-4xs font-bold transition-colors ${
                  mockFaceStatus === 'normal' ? 'bg-brand-yellow text-bg-darkest' : 'bg-white/5 border border-border-subtle hover:bg-white/10'
                }`}
              >
                1 Face (Normal)
              </button>
              <button 
                onClick={() => changeMockFaceStatus('absent')}
                className={`py-1 rounded text-4xs font-bold transition-colors ${
                  mockFaceStatus === 'absent' ? 'bg-status-danger text-white font-extrabold' : 'bg-white/5 border border-border-subtle hover:bg-white/10'
                }`}
              >
                No Face
              </button>
              <button 
                onClick={() => changeMockFaceStatus('multiple')}
                className={`py-1 rounded text-4xs font-bold transition-colors ${
                  mockFaceStatus === 'multiple' ? 'bg-status-danger text-white font-extrabold' : 'bg-white/5 border border-border-subtle hover:bg-white/10'
                }`}
              >
                Multi-Face
              </button>
              <button 
                onClick={() => changeMockFaceStatus('movement')}
                className={`py-1 rounded text-4xs font-bold transition-colors ${
                  mockFaceStatus === 'movement' ? 'bg-status-warning text-white font-extrabold' : 'bg-white/5 border border-border-subtle hover:bg-white/10'
                }`}
              >
                Excessive Move
              </button>
            </div>
            <p className="text-[9px] text-text-secondary leading-relaxed">
              Use these buttons to simulate camera visual events and test auto-submit trigger flows.
            </p>
          </div>

          {/* Question Grid navigator */}
          <div className="space-y-2 flex-1">
            <span className="text-3xs font-extrabold uppercase text-text-secondary tracking-wider">Question Navigator Grid</span>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const hasAnswer = answers[q.id] && answers[q.id].toString().trim().length > 0;
                const isCurrent = idx === currentIdx;
                const isFlagged = flagged[q.id];
                
                let btnClass = 'bg-bg-darkest border-border-subtle text-text-secondary';
                if (isCurrent) btnClass = 'border-brand-yellow text-brand-yellow bg-brand-yellow/5 ring-1 ring-brand-yellow';
                else if (isFlagged) btnClass = 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow';
                else if (hasAnswer) btnClass = 'bg-white/5 border-white/20 text-white';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`aspect-square border rounded-lg text-xs font-bold transition-all ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Violations Warning list */}
          {warningsCount > 0 && (
            <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-xl space-y-2">
              <span className="text-2xs font-extrabold uppercase text-status-danger flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Violations Logged ({warningsCount})
              </span>
              <div className="text-[9px] text-text-secondary max-h-[80px] overflow-y-auto space-y-1">
                {eventsLog.filter(e => e.type !== 'Exam Started').slice(-3).map((e, idx) => (
                  <div key={idx} className="border-b border-white/5 pb-1">
                    <span className="font-bold text-white block">{e.type}</span>
                    <span>{e.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Hidden elements to stream source video */}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
    </div>
  );
}
