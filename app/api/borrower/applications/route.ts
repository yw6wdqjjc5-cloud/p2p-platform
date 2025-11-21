import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

type BorrowerUserInput = {
  email: string;
  phone: string;
  country: string;
};

type CarInput = {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  vin?: string;
};

type LoanInput = {
  requested_amount: number;
  term_months: number;
  currency: string;
};

type ApplicationRequest = {
  borrowerUser: BorrowerUserInput;
  car: CarInput;
  loan: LoanInput;
};

function validateRequest(body: unknown): body is ApplicationRequest {
  if (!body || typeof body !== 'object') return false;

  const { borrowerUser, car, loan } = body as ApplicationRequest;
  return Boolean(
    borrowerUser &&
      typeof borrowerUser.email === 'string' &&
      typeof borrowerUser.phone === 'string' &&
      typeof borrowerUser.country === 'string' &&
      car &&
      typeof car.brand === 'string' &&
      typeof car.model === 'string' &&
      Number.isFinite(car.year) &&
      Number.isFinite(car.mileage) &&
      loan &&
      Number.isFinite(loan.requested_amount) &&
      Number.isFinite(loan.term_months) &&
      typeof loan.currency === 'string'
  );
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { borrowerUser, car, loan } = payload;

    // Step 1: Insert or fetch user
    const { data: existingUser, error: fetchUserError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', borrowerUser.email)
      .maybeSingle();

    if (fetchUserError) {
      console.error('Failed to fetch user', fetchUserError);
      return NextResponse.json(
        { success: false, error: 'Unable to process request' },
        { status: 500 }
      );
    }

    let userId = existingUser?.id;

    if (!userId) {
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          email: borrowerUser.email,
          phone: borrowerUser.phone,
        })
        .select('id')
        .single();

      if (createUserError || !newUser) {
        console.error('Failed to create user', createUserError);
        return NextResponse.json(
          { success: false, error: 'Unable to create user' },
          { status: 500 }
        );
      }

      userId = newUser.id;
    }

    // Step 2: Insert or fetch borrower
    const { data: existingBorrower, error: borrowerLookupError } = await supabaseAdmin
      .from('borrowers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (borrowerLookupError) {
      console.error('Failed to fetch borrower', borrowerLookupError);
      return NextResponse.json(
        { success: false, error: 'Unable to process borrower' },
        { status: 500 }
      );
    }

    if (!existingBorrower) {
      const { error: createBorrowerError } = await supabaseAdmin.from('borrowers').insert({
        id: userId,
        country: borrowerUser.country,
        kyc_status: 'pending',
        has_business: false,
      });

      if (createBorrowerError) {
        console.error('Failed to create borrower', createBorrowerError);
        return NextResponse.json(
          { success: false, error: 'Unable to create borrower' },
          { status: 500 }
        );
      }
    }

    // Step 3: Create asset
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .insert({
        borrower_id: userId,
        type: 'car',
        title: `${car.brand} ${car.model}`.trim(),
        country: borrowerUser.country,
        raw_data: { car },
      })
      .select('id')
      .single();

    if (assetError || !asset) {
      console.error('Failed to create asset', assetError);
      return NextResponse.json(
        { success: false, error: 'Unable to create asset' },
        { status: 500 }
      );
    }

    // Step 4: Create car
    const { error: carError } = await supabaseAdmin.from('cars').insert({
      id: asset.id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      mileage: car.mileage,
      vin: car.vin ?? null,
      market_value_estimate: null,
    });

    if (carError) {
      console.error('Failed to create car record', carError);
      return NextResponse.json(
        { success: false, error: 'Unable to create car record' },
        { status: 500 }
      );
    }

    // Step 5: Create loan
    const { data: newLoan, error: loanError } = await supabaseAdmin
      .from('loans')
      .insert({
        borrower_id: userId,
        asset_id: asset.id,
        car_id: asset.id,
        amount: loan.requested_amount,
        term_months: loan.term_months,
        currency: loan.currency,
        status: 'draft',
      })
      .select('id')
      .single();

    if (loanError || !newLoan) {
      console.error('Failed to create loan', loanError);
      return NextResponse.json(
        { success: false, error: 'Unable to create loan' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        loan_id: newLoan.id,
        asset_id: asset.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error creating borrower application', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
