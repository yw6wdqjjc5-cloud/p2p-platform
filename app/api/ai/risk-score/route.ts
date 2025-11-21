import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { supabaseAdmin } from '@/lib/supabase';

type RiskScoreRequest = {
  loan_id: string;
};

function validateRequest(body: unknown): body is RiskScoreRequest {
  if (!body || typeof body !== 'object') return false;
  const { loan_id } = body as RiskScoreRequest;
  return typeof loan_id === 'string' && loan_id.length > 0;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: loan_id is required' },
        { status: 400 }
      );
    }

    const { loan_id } = payload;

    // Step 1: Fetch loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('id, borrower_id, asset_id, amount, currency, term_months, status')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      console.error('Failed to fetch loan', loanError);
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 400 }
      );
    }

    // Step 2: Fetch user (borrower)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, phone')
      .eq('id', loan.borrower_id)
      .single();

    if (userError || !user) {
      console.error('Failed to fetch user', userError);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 400 }
      );
    }

    // Step 3: Fetch borrower
    const { data: borrower, error: borrowerError } = await supabaseAdmin
      .from('borrowers')
      .select('id, country, kyc_status')
      .eq('id', loan.borrower_id)
      .single();

    if (borrowerError || !borrower) {
      console.error('Failed to fetch borrower', borrowerError);
      return NextResponse.json(
        { success: false, error: 'Borrower not found' },
        { status: 400 }
      );
    }

    // Step 4: Fetch asset
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('id, type, title, country')
      .eq('id', loan.asset_id)
      .single();

    if (assetError || !asset) {
      console.error('Failed to fetch asset', assetError);
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 400 }
      );
    }

    // Step 5: Fetch car
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('id, brand, model, year, mileage, vin, market_value_estimate')
      .eq('id', loan.asset_id)
      .single();

    if (carError || !car) {
      console.error('Failed to fetch car', carError);
      return NextResponse.json(
        { success: false, error: 'Car not found' },
        { status: 400 }
      );
    }

    // Step 6: Check OpenAI API key and determine mode
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let aiResponse: { score: number; recommended_ltv: number; comments: string };
    let modelVersion: string;
    let isMockMode = false;

    if (!openaiApiKey) {
      // MOCK MODE: Generate random risk assessment
      console.log('OpenAI API key not configured. Using MOCK MODE for testing.');
      isMockMode = true;

      const mockScore = Math.floor(Math.random() * 60) + 30; // 30-90
      const mockLTV = (Math.floor(Math.random() * 30) + 40) / 100; // 0.40-0.70

      aiResponse = {
        score: mockScore,
        recommended_ltv: mockLTV,
        comments: 'Mock scoring for testing purposes.',
      };

      modelVersion = 'mock-v1';
    } else {
      // REAL MODE: Use OpenAI API
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const prompt = `Analyze loan risk for a car-backed microloan.

Use JSON output:
{
  "score": <number (0-100, where 100 is lowest risk)>,
  "recommended_ltv": <number (0-1, e.g., 0.75 for 75%)>,
  "comments": "<your assessment>"
}

Input:

Loan:
- Amount: ${loan.amount} ${loan.currency}
- Term: ${loan.term_months} months

Borrower:
- Country: ${borrower.country}
- KYC Status: ${borrower.kyc_status}
- Email: ${user.email}

Car:
- Brand: ${car.brand}
- Model: ${car.model}
- Year: ${car.year}
- Mileage: ${car.mileage} km
- VIN: ${car.vin || 'Not provided'}
- Market Value Estimate: ${car.market_value_estimate || 'Not available'}

Provide a risk assessment considering the vehicle value, borrower country, loan amount, and term.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional automotive loan risk assessment AI. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const aiResponseText = completion.choices[0]?.message?.content;
      if (!aiResponseText) {
        return NextResponse.json(
          { success: false, error: 'No response from AI' },
          { status: 500 }
        );
      }

      // Parse AI response
      try {
        aiResponse = JSON.parse(aiResponseText);

        if (
          typeof aiResponse.score !== 'number' ||
          typeof aiResponse.recommended_ltv !== 'number' ||
          typeof aiResponse.comments !== 'string'
        ) {
          throw new Error('Invalid AI response structure');
        }

        if (aiResponse.score < 0 || aiResponse.score > 100) {
          throw new Error('Score out of range (must be 0-100)');
        }

        if (aiResponse.recommended_ltv < 0 || aiResponse.recommended_ltv > 1) {
          throw new Error('LTV out of range (must be 0-1)');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response', parseError, aiResponseText);
        return NextResponse.json(
          { success: false, error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }

      modelVersion = 'gpt-4o-mini';
    }

    // Determine risk level based on score
    let riskLevel: string;
    if (aiResponse.score >= 70) {
      riskLevel = 'low';
    } else if (aiResponse.score >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Insert risk score (using actual schema: id, loan_id, score, risk_level, created_at)
    const { data: riskScore, error: riskScoreError } = await supabaseAdmin
      .from('risk_scores')
      .insert({
        loan_id: loan.id,
        score: aiResponse.score,
        risk_level: riskLevel,
      })
      .select()
      .single();

    if (riskScoreError || !riskScore) {
      console.error('Failed to save risk score', riskScoreError);
      return NextResponse.json(
        { success: false, error: 'Failed to save risk score' },
        { status: 500 }
      );
    }

    // Update loan status to 'published'
    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ status: 'published' })
      .eq('id', loan.id);

    if (updateLoanError) {
      console.error('Failed to update loan status', updateLoanError);
      // Don't fail the request, just log the error
    }

    // Log the risk scoring event
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'risk_scored',
      data: {
        loan_id: loan.id,
        risk_score_id: riskScore.id,
        score: aiResponse.score,
        risk_level: riskLevel,
        mock_mode: isMockMode,
        model_version: modelVersion,
      },
    });

    return NextResponse.json(
      {
        success: true,
        mock: isMockMode,
        risk_score: riskScore,
        risk_level: riskLevel,
        loan_status: 'published',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in AI risk scoring', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
