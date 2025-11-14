// Small date helpers to format dates in local YYYY-MM-DD without timezone shifts
export const toLocalYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const fromLocalYYYYMMDD = (isoString) => {
    if (!isoString) return null;
    const parts = isoString.split('-');
    if (parts.length !== 3) return null;
    const [yyyy, mm, dd] = parts.map(p => parseInt(p, 10));
    // Construct using local date (year, monthIndex, day)
    return new Date(yyyy, mm - 1, dd);
};

export default { toLocalYYYYMMDD, fromLocalYYYYMMDD };
