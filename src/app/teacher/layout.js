"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, BrainCircuit, LogOut, Settings } from 'lucide-react';
import AiAssistant from '@/components/AiAssistant';

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (user.role !== 'teacher') {
        // Redirect to appropriate dashboard if role is incorrect
        if (user.role === 'student') router.push('/student');
        else if (user.role === 'admin') router.push('/admin');
      }
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading || !user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-bg-darkest flex items-center justify-center text-text-secondary text-sm">
        Verifying teacher authorization...
      </div>
    );
  }

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/teacher',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      name: 'AI Generator',
      path: '/teacher/generator',
      icon: <BrainCircuit className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen flex bg-bg-darkest text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-dark border-r border-border-subtle flex flex-col h-screen sticky top-0 shrink-0">
        {/* Sidebar Header Logo */}
        <div className="p-6 border-b border-border-subtle flex items-center gap-2">
          <div className="bg-brand-yellow text-bg-darkest w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg">E</div>
          <span className="font-heading font-extrabold text-lg tracking-tight">Exam<span className="text-brand-yellow">AI</span></span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-brand-yellow/10 text-brand-yellow border-l-2 border-brand-yellow' 
                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User info */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-brand-yellow/10 border border-brand-yellow flex items-center justify-center text-brand-yellow font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-4xs text-brand-yellow uppercase tracking-wider font-extrabold font-heading">Faculty</p>
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

      {/* Main content wrapper */}
      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        {children}
      </main>
      <AiAssistant />
    </div>
  );
}
