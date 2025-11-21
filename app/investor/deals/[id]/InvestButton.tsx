'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

type InvestButtonProps = {
  loanId: string;
  maxAmount: number;
  currency: string;
};

export function InvestButton({ loanId, maxAmount, currency }: InvestButtonProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const investmentAmount = Number(amount);

    // Validation
    if (!investmentAmount || investmentAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (investmentAmount > maxAmount) {
      setError(`Amount cannot exceed ${maxAmount.toLocaleString()} ${currency}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/investments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loanId,
          investor_email: 'test@investor.com', // Hardcoded for now as per requirements
          amount: investmentAmount,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create investment');
      }

      setSuccess(true);
      setAmount('');

      // Refresh the page to show updated investment data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
      console.error('Error creating investment:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
          Investment Amount ({currency})
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="1"
            max={maxAmount}
            step="1"
            disabled={isSubmitting || success}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || success}
            className="rounded-md bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Processing...' : success ? 'Invested!' : 'Invest'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Maximum: {maxAmount.toLocaleString()} {currency}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Investment created successfully! The page will refresh shortly.
        </div>
      )}
    </form>
  );
}


