type Payment = {
  id: string;
  loan_id: string;
  investment_id: string;
  due_date: string;
  interest_payment: number;
  principal_payment: number;
  status: string;
  paid_at: string | null;
};

type PaymentsTableProps = {
  payments: Payment[];
};

export function PaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
        No payments to display
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Due Date</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Interest Payment
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Principal Payment
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Total Payment
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Loan ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((payment) => {
              const totalPayment = payment.interest_payment + payment.principal_payment;
              const dueDate = new Date(payment.due_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{dueDate}</td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {payment.interest_payment.toLocaleString()} KZT
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {payment.principal_payment > 0
                      ? `${payment.principal_payment.toLocaleString()} KZT`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {totalPayment.toLocaleString()} KZT
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {payment.loan_id.slice(0, 8)}...
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


