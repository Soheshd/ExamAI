"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fbConfig, setFbConfig] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    // Restore session
    const savedUser = localStorage.getItem('examai_current_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('examai_current_user');
      }
    }

    // Restore integration settings
    const savedFb = localStorage.getItem('examai_fb_config');
    if (savedFb) {
      setFbConfig(savedFb);
    }
    const savedGemini = localStorage.getItem('examai_gemini_key');
    if (savedGemini) {
      setGeminiKey(savedGemini);
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const userDoc = await db.loginUser(email, password);
    setUser(userDoc);
    localStorage.setItem('examai_current_user', JSON.stringify(userDoc));
    return userDoc;
  };

  const signup = async (email, password, name, role) => {
    const userDoc = await db.createUser(email, password, name, role);
    setUser(userDoc);
    localStorage.setItem('examai_current_user', JSON.stringify(userDoc));
    return userDoc;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('examai_current_user');
  };

  const saveSettings = (gKey, fbConfigStr) => {
    // Save to local storage
    localStorage.setItem('examai_gemini_key', gKey);
    setGeminiKey(gKey);

    if (fbConfigStr.trim()) {
      try {
        JSON.parse(fbConfigStr); // validate JSON
        localStorage.setItem('examai_fb_config', fbConfigStr);
        setFbConfig(fbConfigStr);
      } catch (e) {
        throw new Error('Firebase configuration must be valid JSON');
      }
    } else {
      localStorage.removeItem('examai_fb_config');
      setFbConfig(null);
    }
  };

  const resetSettings = () => {
    localStorage.removeItem('examai_gemini_key');
    localStorage.removeItem('examai_fb_config');
    setGeminiKey("");
    setFbConfig(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        fbConfig,
        geminiKey,
        saveSettings,
        resetSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
