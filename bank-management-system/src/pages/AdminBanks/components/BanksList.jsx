export default function BanksList({ banks, onDeleteBank }) {
  return (
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
              onClick={() => onDeleteBank(bank._id)}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
