import { Plus } from 'lucide-react';

export default function TransactionsHeader({ onNewAction }) {
  return (
    <div className="transactions-header flex justify-between items-center mb-6">
      <h1 className="transactions-title text-3xl font-bold">Transactions & Transfers</h1>

      <button
        className="transactions-new-action-btn flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none bg-[linear-gradient(135deg,_#0A1F44_0%,_#1E3A8A_50%,_#00D4FF_100%)]"
        onClick={onNewAction}
      >
        <Plus size={18} /> New Action
      </button>
    </div>
  );
}
