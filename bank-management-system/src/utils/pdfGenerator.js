import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generate a PDF mini statement from transaction data
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} user - User information object
 * @param {string} accountNumber - Account number
 * @param {Date} startDate - Start date for the statement period
 * @param {Date} endDate - End date for the statement period
 */
export const generateMiniStatementPDF = async (transactions, user, accountNumber, startDate, endDate) => {
    const pdf = new jsPDF();

    // Set up colors and fonts
    const primaryColor = [102, 126, 234]; // Bank blue
    const secondaryColor = [108, 117, 125]; // Gray
    const textColor = [51, 51, 51]; // Dark gray

    // Header
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BankPro', 20, 20);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Mini Statement', 20, 30);

    // Bank details
    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.text('Generated on: ' + new Date().toLocaleDateString(), 150, 15);
    pdf.text('Account: ' + accountNumber, 150, 25);
    pdf.text('Period: ' + startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString(), 150, 35);
    pdf.text('Currency: INR (₹)', 150, 45);

    // Customer details
    let yPosition = 50;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer Details', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Name: ' + (user?.name || 'N/A'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Type: ' + (user?.accountType || 'Savings'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Number: ' + accountNumber, 20, yPosition);

    // Transaction summary
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transaction Summary', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    pdf.text('Total Credits: ₹' + totalCredits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Debits: ₹' + totalDebits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Net Balance: ₹' + (totalCredits - totalDebits).toFixed(2), 20, yPosition);

    // Transactions table
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recent Transactions', 20, yPosition);

    // Table headers
    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPosition);
    pdf.text('Description', 50, yPosition);
    pdf.text('Type', 120, yPosition);
    pdf.text('Amount', 150, yPosition);

    // Header line
    pdf.setDrawColor(...secondaryColor);
    pdf.line(20, yPosition + 2, 190, yPosition + 2);

    // Transaction rows
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');

    transactions.slice(0, 10).forEach((transaction, index) => {
        if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
        }

        const date = new Date(transaction.date).toLocaleDateString();
        const description = transaction.description || 'Transaction';
        const type = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
        const amount = '₹' + parseFloat(transaction.amount).toFixed(2);

        pdf.text(date, 20, yPosition);
        pdf.text(description.substring(0, 30), 50, yPosition);
        pdf.text(type, 120, yPosition);
        pdf.text(amount, 150, yPosition);

        yPosition += 6;
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(...secondaryColor);
    pdf.text('This is a computer-generated statement. For any discrepancies, please contact customer support.', 20, 285);
    pdf.text('BankPro - Your Trusted Banking Partner', 105, 285, { align: 'center' });

    // Save the PDF
    const fileName = `mini_statement_${accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};

/**
 * Generate a PDF from an HTML element
 * @param {HTMLElement} element - The HTML element to convert to PDF
 * @param {string} fileName - Name of the PDF file
 */
export const generatePDFFromHTML = async (element, fileName) => {
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();

        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(fileName);
    } catch (error) {
        console.error('Error generating PDF from HTML:', error);
        throw error;
    }
};

/**
 * Generate a detailed account statement PDF
 * @param {Array} transactions - Array of all transactions
 * @param {Object} user - User information
 * @param {string} accountNumber - Account number
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
export const generateAccountStatementPDF = async (transactions, user, accountNumber, startDate, endDate) => {
    const pdf = new jsPDF();

    // Similar structure to mini statement but with more details
    // Header
    pdf.setFillColor(102, 126, 234);
    pdf.rect(0, 0, 210, 50, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BankPro', 20, 25);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Account Statement', 20, 35);

    pdf.setTextColor(51, 51, 51);
    pdf.setFontSize(10);
    pdf.text('Generated on: ' + new Date().toLocaleDateString(), 150, 20);
    pdf.text('Account: ' + accountNumber, 150, 30);
    pdf.text('Period: ' + startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString(), 150, 40);
    pdf.text('Currency: INR (₹)', 150, 50);

    // Customer and account details
    let yPosition = 60;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Account Information', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Account Holder: ' + (user?.name || 'N/A'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Type: ' + (user?.accountType || 'Savings'), 20, yPosition);
    yPosition += 6;
    pdf.text('Account Number: ' + accountNumber, 20, yPosition);
    yPosition += 6;
    pdf.text('Branch: Main Branch', 20, yPosition);

    // Opening and closing balance
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Balance Summary', 20, yPosition);

    yPosition += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const openingBalance = 1000; // This should be calculated from actual data
    const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const closingBalance = openingBalance + totalCredits - totalDebits;

    pdf.text('Opening Balance: ₹' + openingBalance.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Credits: ₹' + totalCredits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Total Debits: ₹' + totalDebits.toFixed(2), 20, yPosition);
    yPosition += 6;
    pdf.text('Closing Balance: ₹' + closingBalance.toFixed(2), 20, yPosition);

    // Transactions table with more columns
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transaction Details', 20, yPosition);

    // Table headers
    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPosition);
    pdf.text('Time', 45, yPosition);
    pdf.text('Description', 60, yPosition);
    pdf.text('Reference', 120, yPosition);
    pdf.text('Debit', 160, yPosition);
    pdf.text('Credit', 180, yPosition);

    // Header line
    pdf.setDrawColor(108, 117, 125);
    pdf.line(20, yPosition + 2, 190, yPosition + 2);

    // Transaction rows
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');

    transactions.forEach((transaction, index) => {
        if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
        }

        const date = new Date(transaction.date).toLocaleDateString();
        const time = new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const description = (transaction.description || 'Transaction').substring(0, 25);
        const reference = transaction.id || 'N/A';
        const debit = transaction.type === 'debit' ? '₹' + parseFloat(transaction.amount).toFixed(2) : '';
        const credit = transaction.type === 'credit' ? '₹' + parseFloat(transaction.amount).toFixed(2) : '';

        pdf.text(date, 20, yPosition);
        pdf.text(time, 45, yPosition);
        pdf.text(description, 60, yPosition);
        pdf.text(reference, 120, yPosition);
        pdf.text(debit, 160, yPosition);
        pdf.text(credit, 180, yPosition);

        yPosition += 6;
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(108, 117, 125);
    pdf.text('This is a computer-generated statement and does not require a signature.', 20, 285);
    pdf.text('For any queries, please contact BankPro customer support.', 20, 290);
    pdf.text('Page 1 of 1', 180, 285);

    const fileName = `account_statement_${accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};
