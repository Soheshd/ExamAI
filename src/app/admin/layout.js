"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (user.role !== 'admin') {
        // Redirect to correct dashboard if role is incorrect
        if (user.role === 'student') router.push('/student');
        else if (user.role === 'teacher') router.push('/teacher');
      }
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-bg-darkest flex items-center justify-center text-text-secondary text-sm">
        Verifying administrator privileges...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-darkest text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-dark border-r border-border-subtle flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 border-b border-border-subtle flex items-center gap-2">
          <div className="bg-brand-yellow text-bg-darkest w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg">E</div>
          <span className="font-heading font-extrabold text-lg tracking-tight">Exam<span className="text-brand-yellow">AI</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link 
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              pathname === '/admin' 
                ? 'bg-brand-yellow/10 text-brand-yellow border-l-2 border-brand-yellow' 
                : 'text-text-secondary hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Admin Console</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-brand-yellow/10 border border-brand-yellow flex items-center justify-center text-brand-yellow font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-4xs text-brand-yellow uppercase tracking-wider font-extrabold font-heading">Admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-text-secondary hover:text-status-danger rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        {children}
      </main>
    </div>
  );
}
