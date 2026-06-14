import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export async function POST(req) {
  try {
    const { subject, difficulty, numQuestions, totalMarks, types } = await req.json();
    
    if (!subject) {
      return NextResponse.json({ error: 'Missing subject parameter' }, { status: 400 });
    }

    const questions = await ai.generateExamQuestions(
      subject,
      difficulty || 'medium',
      numQuestions || 5,
      totalMarks || 50,
      types || { mcq: true, short: true, long: true }
    );

    return NextResponse.json(questions);
  } catch (err) {
    console.error('API Generate Questions failed:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
