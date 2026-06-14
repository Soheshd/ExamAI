"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle, ArrowRight, Sparkles, BrainCircuit, Activity, ShieldCheck, HelpCircle, UserCheck, Star } from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: <BrainCircuit className="w-6 h-6 text-brand-yellow" />,
      title: "AI Question Paper Generator",
      desc: "Instantly create high-quality multiple choice, short answer, and scenario-based exam papers using Gemini AI tailored to subject matter and difficulty."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-brand-yellow" />,
      title: "Smart Secure Examination",
      desc: "Prevent academic malpractice with fullscreen enforcement, focus loss monitoring, and Canvas-based proctor camera check logs."
    },
    {
      icon: <Activity className="w-6 h-6 text-brand-yellow" />,
      title: "Auto Evaluation & Analytics",
      desc: "Submit exams for instant automated grading, detailed topic-by-topic score breakdowns, weakness detection, and learning insights."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-brand-yellow" />,
      title: "Personalized Study Planner",
      desc: "Let Gemini construct customized daily and weekly revision schedules automatically adapting to past exam scores and weaknesses."
    },
    {
      icon: <Star className="w-6 h-6 text-brand-yellow" />,
      title: "AI Oral Viva Simulator",
      desc: "Simulate oral boards where an AI examiner asks subject-based questions, scores responses, and provides constructive feedback."
    },
    {
      icon: <UserCheck className="w-6 h-6 text-brand-yellow" />,
      title: "Full Admin Management",
      desc: "Oversee user roles, examine platform analytics, monitor system logs, and inspect integrity audits in a unified control panel."
    }
  ];

  const steps = [
    { num: "01", title: "Faculty Creates Exam", desc: "Teachers set parameters (subject, marks, difficulty) and Gemini generates draft questions." },
    { num: "02", title: "Secured Examination", desc: "Students take the exam under secure full-screen, proctored environment." },
    { num: "03", title: "Instant AI Evaluation", desc: "Answers are parsed and evaluated. Detailed marks and weak areas are extracted." },
    { num: "04", title: "Adapt & Learn", desc: "AI creates a study schedule and oral practice sessions targeting identified gaps." }
  ];

  const faqs = [
    { q: "How does the AI Question Generator work?", a: "Teachers input a subject, target marks, and question types. ExamAI uses the Gemini API to construct unique, high-quality questions with answer keys in seconds." },
    { q: "How secure is the online proctoring system?", a: "The proctoring system tracks fullscreen exits, window blurs, tab switching, and uses webcam canvas analysis to verify that the student remains present and focused." },
    { q: "Is Firebase required to run the application?", a: "No, ExamAI features a high-fidelity standalone demo mode that automatically uses LocalStorage if Firebase configuration is not connected. It syncs with Firestore once configured!" },
    { q: "Can teachers edit AI-generated questions?", a: "Yes, teachers have full control to edit text, adjust marks distribution, regenerate specific questions, or add custom items before publishing." }
  ];

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-bg-darkest text-text-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-bg-darkest/70 backdrop-blur-xl border-b border-border-subtle px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-brand-accent to-brand-yellow w-9 h-9 rounded-lg flex items-center justify-center font-bold text-bg-darkest text-xl">
            E
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight">
            Exam<span className="text-brand-yellow">AI</span>
          </span>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-medium text-text-secondary">
          <a href="#features" className="hover:text-brand-yellow transition-colors">Features</a>
          <a href="#workflow" className="hover:text-brand-yellow transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-brand-yellow transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-brand-yellow transition-colors">FAQ</a>
        </div>

        <div className="flex gap-4">
          <Link href="/auth" className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-semibold hover:border-brand-yellow hover:text-brand-yellow transition-all">
            Login
          </Link>
          <Link href="/auth?signup=true" className="px-4 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-semibold rounded-lg text-sm hover:opacity-90 shadow-yellow-glow hover:translate-y-[-1px] transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 text-center flex flex-col items-center justify-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute top-0 w-80 h-80 rounded-full bg-brand-yellow/5 filter blur-3xl -z-10" />
        
        <div className="px-4 py-1.5 bg-brand-yellow/8 border border-border-yellow rounded-full text-xs font-bold text-brand-yellow mb-6 uppercase tracking-wider">
          🚀 Next-Gen AI EdTech Ecosystem
        </div>
        
        <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight leading-tight mb-6 max-w-4xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-neutral-400">
          Intelligent Examination & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-yellow">Learning Platform</span>
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-3xl leading-relaxed">
          Create AI-generated exam papers in seconds, administer tests under secure proctoring environments, and accelerate student success with automated analytics and personalized study plans.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth?signup=true" className="px-8 py-4 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-xl shadow-yellow-glow hover:shadow-yellow-glow-lg transition-all flex items-center gap-2 group hover:translate-y-[-1px]">
            Bootstrap Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#features" className="px-8 py-4 bg-white/5 border border-border-subtle font-semibold rounded-xl hover:bg-white/10 transition-all">
            Explore Features
          </a>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="px-6 py-20 border-t border-border-subtle max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold mb-4">
            AI-Powered Capabilities
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            From smart question papers to virtual oral viva simulator panels, ExamAI streamlines every stage of the academic evaluation lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-8 flex flex-col gap-4">
              <div className="bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-border-subtle">
                {f.icon}
              </div>
              <h3 className="text-xl font-heading font-bold text-white">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="px-6 py-20 bg-bg-dark border-y border-border-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold mb-4">
              How ExamAI Operates
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Follow our simple, robust end-to-end examination workflow designed for modern digital class systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative flex flex-col gap-4 bg-bg-darkest/40 p-6 rounded-xl border border-border-subtle">
                <span className="font-heading font-black text-5xl text-brand-yellow/10 absolute top-4 right-4">{s.num}</span>
                <h3 className="text-lg font-heading font-bold text-white z-10">{s.title}</h3>
                <p className="text-text-secondary text-sm z-10">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold mb-4">
            Flexible Subscription Models
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Scale seamlessly from local homework evaluations to enterprise academy examinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Plan 1 */}
          <div className="glass-card p-8 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-text-secondary">Standard (Offline)</h3>
              <p className="text-3xl font-heading font-extrabold text-white mt-2">$0 <span className="text-sm font-normal text-text-secondary">/ forever</span></p>
            </div>
            <p className="text-text-secondary text-xs">High-fidelity offline standalone mockup using local storage.</p>
            <ul className="text-sm text-text-secondary flex flex-col gap-3">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Offline AI Simulator</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> LocalStorage Data Sync</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Basic Exam Formats</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> PDF Certificate Export</li>
            </ul>
            <Link href="/auth?signup=true" className="px-4 py-2 bg-white/5 border border-border-subtle rounded-lg text-center font-semibold hover:bg-white/10 mt-auto transition-colors">
              Start Free Demo
            </Link>
          </div>

          {/* Plan 2 */}
          <div className="glass-card p-8 border-brand-yellow glow-yellow flex flex-col gap-6 relative">
            <span className="absolute top-4 right-4 bg-brand-yellow text-bg-darkest text-2xs font-extrabold uppercase px-2 py-0.5 rounded">Popular</span>
            <div>
              <h3 className="text-lg font-heading font-bold text-brand-yellow">Creator Pro</h3>
              <p className="text-3xl font-heading font-extrabold text-white mt-2">$29 <span className="text-sm font-normal text-text-secondary">/ month</span></p>
            </div>
            <p className="text-text-secondary text-xs">Connect your own integrations for live cloud storage and Gemini AI.</p>
            <ul className="text-sm text-text-secondary flex flex-col gap-3">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Live Gemini AI Prompts</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Firestore Cloud Database</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Real-time Webcam Proctoring</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> AI Viva Simulator Boards</li>
            </ul>
            <Link href="/auth?signup=true" className="px-4 py-2 bg-gradient-to-r from-brand-accent to-brand-yellow text-bg-darkest font-bold rounded-lg text-center hover:opacity-95 shadow-yellow-glow mt-auto transition-all">
              Launch Pro Plan
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="glass-card p-8 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-text-secondary">Institutional</h3>
              <p className="text-3xl font-heading font-extrabold text-white mt-2">$99 <span className="text-sm font-normal text-text-secondary">/ month</span></p>
            </div>
            <p className="text-text-secondary text-xs">Custom hosting pipelines for schools, universities and institutions.</p>
            <ul className="text-sm text-text-secondary flex flex-col gap-3">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Dedicated Cloud Nodes</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> 99.9% Uptime Agreement</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> CSV/PDF Malpractice Audits</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-yellow" /> Specialized Admin Panels</li>
            </ul>
            <Link href="/auth?signup=true" className="px-4 py-2 bg-white/5 border border-border-subtle rounded-lg text-center font-semibold hover:bg-white/10 mt-auto transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faq" className="px-6 py-20 bg-bg-dark border-t border-border-subtle">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-extrabold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-text-secondary">
              Everything you need to know about the ExamAI platform mechanics.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-bg-darkest/60 border border-border-subtle rounded-xl overflow-hidden transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-6 py-5 font-heading font-bold text-white flex justify-between items-center hover:bg-white/2 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-brand-yellow text-xl font-light">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-text-secondary leading-relaxed border-t border-white/2 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-darkest border-t border-border-subtle px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-brand-yellow text-bg-darkest w-7 h-7 rounded flex items-center justify-center font-bold text-sm">E</div>
            <span className="font-heading font-extrabold text-md tracking-tight">Exam<span className="text-brand-yellow">AI</span></span>
          </div>

          <p className="text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} ExamAI Technologies Inc. All Rights Reserved. Built for Hackathons & Institutions.
          </p>

          <div className="flex gap-6 text-xs text-text-secondary">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
