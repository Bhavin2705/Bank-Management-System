import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useNotification } from '../components/NotificationProvider';

export default function AdminBanks() {
  const { showError, showSuccess } = useNotification();
  const [banks, setBanks] = useState([]);
  const [newBank, setNewBank] = useState({ name: '', ifscPrefix: '', description: '' });

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await api.users.getBanks();
        if (res?.success) {
          setBanks(res.data);
        } else {
          showError('Failed to fetch banks');
        }
      } catch {
        showError('Error fetching banks');
      }
    };
    fetchBanks();
  }, [showError]);

  const handleAddBank = async () => {
    try {
      const res = await api.banks.addBank(newBank);
      if (res?.success) {
        setBanks([...banks, res.data]);
        setNewBank({ name: '', ifscPrefix: '', description: '' });
        showSuccess('Bank added successfully');
      } else {
        showError('Failed to add bank');
      }
    } catch {
      showError('Error adding bank');
    }
  };

  const handleDeleteBank = async (_id) => {
    try {
      const res = await api.banks.deleteBank(_id);
      if (res?.success) {
        setBanks(banks.filter((bank) => bank._id !== _id));
        showSuccess('Bank deleted successfully');
      } else {
        showError('Failed to delete bank');
      }
    } catch {
      showError('Error deleting bank');
    }
  };

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Manage Banks</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Add New Bank</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            placeholder="Bank Name"
            value={newBank.name}
            onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="IFSC Prefix"
            value={newBank.ifscPrefix}
            onChange={(e) => setNewBank({ ...newBank, ifscPrefix: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Description"
            value={newBank.description}
            onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
            className="form-input"
          />
        </div>
        <button
          onClick={handleAddBank}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Add Bank
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Banks</h2>
        <ul className="space-y-2">
          {banks.map((bank) => (
            <li key={bank._id} className="flex justify-between items-center p-4 bg-white shadow rounded-lg">
              <div>
                <p className="font-medium">{bank.name}</p>
                <p className="text-sm text-gray-500">{bank.description}</p>
              </div>
              <button
                onClick={() => handleDeleteBank(bank._id)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
