export const getDeleteModalConfig = (userId, userName) => ({
  open: true,
  type: 'delete',
  userId,
  title: 'Delete User',
  message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
  confirmText: 'Delete',
  cancelText: 'Cancel'
});

export const getBlockModalConfig = (userId, currentStatus, userName) => ({
  open: true,
  type: 'block',
  userId,
  currentStatus,
  title: currentStatus === 'active' ? 'Block User' : 'Unblock User',
  message: currentStatus === 'active'
    ? `Are you sure you want to block ${userName}? They will not be able to access their account.`
    : `Unblock ${userName} and restore their account access?`,
  confirmText: currentStatus === 'active' ? 'Block' : 'Unblock',
  cancelText: 'Cancel'
});

export const calculateTotalBalance = (users = []) => {
  if (!Array.isArray(users)) return 0;
  return users.reduce((sum, currentUser) => sum + (currentUser.balance || 0), 0);
};
