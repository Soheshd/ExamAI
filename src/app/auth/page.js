"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Key, Database, RefreshCw, LogIn, AlertCircle } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, signup, saveSettings, resetSettings, geminiKey, fbConfig } = useAuth();

  // Mode: 'login' or 'signup'
  const [mode, setMode] = useState('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings Form State
  const [gKey, setGKey] = useState('');
  const [fbConfigStr, setFbConfigStr] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Set default mode based on query params
  useEffect(() => {
    if (searchParams.get('signup') === 'true') {
      setMode('signup');
    }
  }, [searchParams]);

  // Load settings into inputs
  useEffect(() => {
    setGKey(geminiKey || '');
    setFbConfigStr(fbConfig ? JSON.stringify(JSON.parse(fbConfig), null, 2) : '');
  }, [geminiKey, fbConfig]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'student') router.push('/student');
      else if (user.role === 'teacher') router.push('/teacher');
      else if (user.role === 'admin') router.push('/admin');
    }
  }, [user, router]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const u = await login(email, password);
        if (u.role === 'student') router.push('/student');
        else if (u.role === 'teacher') router.push('/teacher');
        else if (u.role === 'admin') router.push('/admin');
      } else {
        const u = await signup(email, password, name, role);
        if (u.role === 'student') router.push('/student');
        else if (u.role === 'teacher') router.push('/teacher');
        else if (u.role === 'admin') router.push('/admin');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setError('');
    setSettingsSuccess('');

    try {
      saveSettings(gKey.trim(), fbConfigStr.trim());
      setSettingsSuccess('Integration settings saved successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to save configuration.');
    }
  };

  const handleResetSettings = () => {
    if (confirm('Reset credentials and fallback to local-storage demo mode?')) {
      resetSettings();
      setSettingsSuccess('Credentials cleared. Switched to offline standalone mode.');
      setGKey('');
      setFbConfigStr('');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-bg-darkest flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-yellow/3 filter blur-3xl -z-10" />

      {/* Main card container */}
      <div className="w-full max-w-md glass-card p-8 glow-yellow relative">
        {/* Toggle Settings trigger */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-brand-yellow transition-colors"
          title="Platform Settings"
        >
          <Database className="w-5 h-5" />
        </button>

        {showSettings ? (
          /* Integrations configuration view */
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-heading font-black text-white flex justify-center items-center gap-2">
                <Database className="w-6 h-6 text-brand-yellow" /> Cloud Setup
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Configure Firebase Firestore and Gemini AI keys. Leave blank to run in offline standalone demo mode.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Gemini API Key</label>
                <input 
                  type="password" 
                  value={gKey} 
                  onChange={(e) => setGKey(e.target.value)}
                  placeholder="AIzaSy..." 
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
                <span className="text-3xs text-text-secondary">Used for live exam question generation, viva simulation, and study plans.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Firebase JSON Web Config</label>
                <textarea 
                  rows={5}
                  value={fbConfigStr} 
                  onChange={(e) => setFbConfigStr(e.target.value)}
                  placeholder={`{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "..."\n}`} 
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-xs text-white font-mono focus:outline-none transition-colors"
                />
                <span className="text-3xs text-text-secondary">Paste your Firebase web config JSON object to enable online multi-user accounts.</span>
              </div>

              {settingsSuccess && (
                <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg text-status-success text-xs font-semibold">
                  {settingsSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={handleResetSettings}
                  className="flex-1 py-2.5 border border-border-subtle rounded-lg text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  Reset Demo
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-yellow text-bg-darkest font-bold rounded-lg text-xs hover:opacity-90 shadow-yellow-glow transition-all"
                >
                  Save Settings
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                className="w-full text-center text-xs text-text-secondary hover:text-brand-yellow mt-4 transition-colors"
              >
                Back to Authentication
              </button>
            </form>
          </div>
        ) : (
          /* Normal Authentication Form */
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex bg-gradient-to-r from-brand-accent to-brand-yellow w-12 h-12 rounded-xl items-center justify-center font-bold text-bg-darkest text-2xl shadow-yellow-glow mb-4">
                E
              </div>
              <h2 className="text-2xl font-heading font-black text-white">
                Welcome to Exam<span className="text-brand-yellow">AI</span>
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {mode === 'login' ? 'Sign in to access your dashboard panels.' : 'Register a new role-based account.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg text-status-danger text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson" 
                    className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Password</label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="bg-white/3 border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Account Role</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-bg-dark border border-border-subtle focus:border-brand-yellow rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                  >
                    <option value="student">Student Dashboard</option>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl hover:opacity-95 shadow-yellow-glow hover:shadow-yellow-glow-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-text-secondary">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-brand-yellow font-semibold hover:underline">
                    Sign up now
                  </button>
                </p>
              ) : (
                <p className="text-xs text-text-secondary">
                  Already registered?{' '}
                  <button onClick={() => setMode('login')} className="text-brand-yellow font-semibold hover:underline">
                    Sign in here
                  </button>
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle text-center">
              <p className="text-[10px] text-text-secondary">
                💡 Hackathon Demo Credentials:<br/>
                Student: <span className="text-white font-mono">student@examai.com</span> | Password: <span className="text-white font-mono">password</span><br/>
                Teacher: <span className="text-white font-mono">teacher@examai.com</span> | Password: <span className="text-white font-mono">password</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-darkest flex items-center justify-center text-white">Loading Auth context...</div>}>
      <AuthContent />
    </Suspense>
  );
}
