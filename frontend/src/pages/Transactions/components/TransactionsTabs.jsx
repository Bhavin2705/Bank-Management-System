import { TABS } from '../constants';
import { getTabLabel } from '../utils';

export default function TransactionsTabs({ activeTab, onTabChange }) {
  return (
    <div className="transactions-tabs border-b border-gray-300 mb-6">
      <div className="transactions-tabs-inner flex gap-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`transactions-tab py-2 text-sm font-medium focus:outline-none ${activeTab === tab
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-blue-600'
              }`}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </div>
    </div>
  );
}
