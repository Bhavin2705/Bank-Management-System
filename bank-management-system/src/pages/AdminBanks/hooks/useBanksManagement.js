import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

export function useBanksManagement(showError, showSuccess) {
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
        setBanks((prevBanks) => [...prevBanks, res.data]);
        setNewBank({ name: '', ifscPrefix: '', description: '' });
        showSuccess('Bank added successfully');
      } else {
        showError('Failed to add bank');
      }
    } catch {
      showError('Error adding bank');
    }
  };

  const handleDeleteBank = async (bankId) => {
    try {
      const res = await api.banks.deleteBank(bankId);
      if (res?.success) {
        setBanks((prevBanks) => prevBanks.filter((bank) => bank._id !== bankId));
        showSuccess('Bank deleted successfully');
      } else {
        showError('Failed to delete bank');
      }
    } catch {
      showError('Error deleting bank');
    }
  };

  return {
    banks,
    newBank,
    setNewBank,
    handleAddBank,
    handleDeleteBank,
  };
}
