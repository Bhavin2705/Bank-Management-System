import { useNotification } from '../../components/providers';
import AddBankForm from './components/AddBankForm';
import BanksList from './components/BanksList';
import { useBanksManagement } from './hooks/useBanksManagement';

export default function AdminBanks() {
  const { showError, showSuccess } = useNotification();
  const { banks, newBank, setNewBank, handleAddBank, handleDeleteBank } = useBanksManagement(showError, showSuccess);

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Manage Banks</h1>

      <AddBankForm
        newBank={newBank}
        setNewBank={setNewBank}
        onAddBank={handleAddBank}
      />

      <BanksList banks={banks} onDeleteBank={handleDeleteBank} />
    </div>
  );
}

