import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export async function POST(req) {
  try {
    const { subjectScores, weakAreas, upcomingExams } = await req.json();
    
    if (!weakAreas) {
      return NextResponse.json({ error: 'Missing weakAreas parameter' }, { status: 400 });
    }

    const plan = await ai.generateStudyPlan(
      subjectScores || [],
      weakAreas,
      upcomingExams || []
    );

    return NextResponse.json(plan);
  } catch (err) {
    console.error('API Generate Study Plan failed:', err);
    return NextResponse.json({ error: err.message || 'Planner compilation failed' }, { status: 500 });
  }
}
