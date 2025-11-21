'use client';

import { FormEvent, useState, type ChangeEvent } from 'react';

type FormState = {
  brand: string;
  model: string;
  year: string;
  mileage: string;
  vin: string;
  requestedAmount: string;
  termMonths: string;
  currency: string;
  country: string;
  phone: string;
  email: string;
};

const initialFormState: FormState = {
  brand: '',
  model: '',
  year: '',
  mileage: '',
  vin: '',
  requestedAmount: '',
  termMonths: '',
  currency: 'KZT',
  country: 'Kazakhstan',
  phone: '',
  email: '',
};

export default function BorrowerApplyPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ loan_id: string; asset_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function validateNumber(value: string) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const year = validateNumber(form.year);
    const mileage = validateNumber(form.mileage);
    const requestedAmount = validateNumber(form.requestedAmount);
    const termMonths = validateNumber(form.termMonths);

    if (!year || !mileage || !requestedAmount || !termMonths) {
      setError('Please provide valid numeric values for year, mileage, amount, and term.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/borrower/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerUser: {
            email: form.email.trim(),
            phone: form.phone.trim(),
            country: form.country.trim(),
          },
          car: {
            brand: form.brand.trim(),
            model: form.model.trim(),
            year,
            mileage,
            vin: form.vin.trim() || undefined,
          },
          loan: {
            requested_amount: requestedAmount,
            term_months: termMonths,
            currency: form.currency.trim(),
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Something went wrong');
      }

      setSuccess(data);
      setForm(initialFormState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Borrower Auto Application</h1>
        <p className="mt-2 text-sm text-slate-600">
          Provide details about your car and desired loan. Our team will review and get in touch.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <section>
            <h2 className="text-lg font-medium text-slate-900">Vehicle details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Brand
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.brand}
                  onChange={handleChange('brand')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Model
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.model}
                  onChange={handleChange('model')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Year
                <input
                  type="number"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.year}
                  onChange={handleChange('year')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Mileage (km)
                <input
                  type="number"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.mileage}
                  onChange={handleChange('mileage')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                VIN (optional)
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.vin}
                  onChange={handleChange('vin')}
                  placeholder="KMHxxx..."
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">Loan details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Requested amount
                <input
                  type="number"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.requestedAmount}
                  onChange={handleChange('requestedAmount')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Term (months)
                <input
                  type="number"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.termMonths}
                  onChange={handleChange('termMonths')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Currency
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.currency}
                  onChange={handleChange('currency')}
                >
                  <option value="KZT">KZT</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">Contact details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Country
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.country}
                  onChange={handleChange('country')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Phone
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                Email
                <input
                  type="email"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />
              </label>
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Application submitted! Loan ID: <span className="font-semibold">{success.loan_id}</span>
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

