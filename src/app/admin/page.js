"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { Users, BookOpen, AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [malpracticeLogs, setMalpracticeLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const uList = await db.getUsers();
        const exList = await db.getExams();
        const logs = await db.getProctoringLogs();
        setUsers(uList);
        setExams(exList);
        setMalpracticeLogs(logs);
      } catch (err) {
        console.error('Failed to load admin logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await db.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Role update failed: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('Are you sure you want to permanently delete this user from the system?')) {
      try {
        await db.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
      } catch (err) {
        alert(`Failed to delete user: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="text-text-secondary text-sm">Loading admin dashboard console...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-black text-white">Admin Console</h1>
        <p className="text-text-secondary text-sm">Oversee platform membership roles, inspect proctor audits, and monitor system parameters.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{users.length}</span>
            <span className="text-xs text-text-secondary">Registered Users</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{exams.length}</span>
            <span className="text-xs text-text-secondary">Exams Published</span>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-3 rounded-lg text-brand-yellow">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold block text-white">{malpracticeLogs.length}</span>
            <span className="text-xs text-text-secondary">Malpractice Warnings</span>
          </div>
        </div>
      </div>

      {/* Split: User list & Malware logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User management */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <h2 className="text-lg font-heading font-bold text-white">User Membership management</h2>
          
          <div className="responsive-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-white">{u.name}</td>
                    <td className="text-text-secondary">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-bg-dark border border-border-subtle rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-yellow"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-text-muted hover:text-status-danger rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Realtime violations logs */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-status-warning" /> System Malpractice Logs
          </h2>

          {malpracticeLogs.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              No anomalies registered on this server.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
              {malpracticeLogs.map((log) => (
                <div key={log.id} className="p-3 bg-white/2 border border-border-subtle rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{log.studentName}</span>
                    <span className="text-status-warning text-4xs uppercase">{log.type}</span>
                  </div>
                  <p className="text-text-secondary text-3xs">{log.examTitle}</p>
                  <p className="text-text-muted text-[10px] text-right">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
