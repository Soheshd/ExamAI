import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "ExamAI – Intelligent Examination & Learning Platform",
  description: "AI-powered examination ecosystem featuring automated question generation, webcam proctoring, performance analytics, AI study planning, and simulated oral viva.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <body className="min-h-full flex flex-col bg-bg-darkest text-text-primary font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
