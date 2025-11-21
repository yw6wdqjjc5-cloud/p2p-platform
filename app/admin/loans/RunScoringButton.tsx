'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type RunScoringButtonProps = {
  loanId: string;
};

export function RunScoringButton({ loanId }: RunScoringButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRunScoring() {
    setIsRunning(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/ai/risk-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to run risk scoring');
      }

      setSuccess(true);
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
      console.error('Error running risk scoring:', err);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRunScoring}
        disabled={isRunning || success}
        className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isRunning ? 'Running...' : success ? 'Scored!' : 'Run AI Scoring'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">✓ Scored successfully</p>}
    </div>
  );
}
