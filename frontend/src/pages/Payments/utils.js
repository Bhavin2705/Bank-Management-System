export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

export const getNextDueDate = (startDateValue, frequency, frequencyMap) => {
  const startDate = new Date(startDateValue);
  const nextDueDate = new Date(startDate);
  const frequencyConfig = frequencyMap[frequency] || {};

  if (frequencyConfig.days) nextDueDate.setDate(nextDueDate.getDate() + frequencyConfig.days);
  if (frequencyConfig.months) nextDueDate.setMonth(nextDueDate.getMonth() + frequencyConfig.months);
  if (frequencyConfig.years) nextDueDate.setFullYear(nextDueDate.getFullYear() + frequencyConfig.years);

  return { startDate, nextDueDate };
};