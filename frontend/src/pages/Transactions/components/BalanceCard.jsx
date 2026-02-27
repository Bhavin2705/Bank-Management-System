import { CreditCard } from 'lucide-react';

export default function BalanceCard({ balance }) {
  return (
    <div className="transactions-balance-card bg-white shadow-md rounded-lg p-6 mb-8">
      <div className="transactions-balance-inner flex justify-between items-center">
        <div>
          <div className="transactions-balance-value text-2xl font-bold">{balance}</div>
          <div className="text-gray-500">Available Balance</div>
        </div>
        <CreditCard size={40} className="transactions-balance-icon text-blue-500" />
      </div>
    </div>
  );
}
