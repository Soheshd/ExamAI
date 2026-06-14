import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export async function POST(req) {
  try {
    const { subject, question, studentAnswer, chatHistory } = await req.json();
    
    if (!subject || !question || studentAnswer === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const evaluation = await ai.evaluateVivaResponse(
      subject,
      question,
      studentAnswer,
      chatHistory || []
    );

    return NextResponse.json(evaluation);
  } catch (err) {
    console.error('API Evaluate Viva failed:', err);
    return NextResponse.json({ error: err.message || 'Evaluation failed' }, { status: 500 });
  }
}
