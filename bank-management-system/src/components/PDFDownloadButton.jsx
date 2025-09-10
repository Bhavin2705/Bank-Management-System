import { Download } from 'lucide-react';
import { useRef } from 'react';
import { generatePDFFromHTML } from '../utils/pdfGenerator';

/**
 * A reusable component for downloading HTML content as PDF
 * @param {Object} props
 * @param {string} props.fileName - Name of the PDF file
 * @param {string} props.buttonText - Text for the download button
 * @param {ReactNode} props.children - The content to be converted to PDF
 * @param {string} props.className - Additional CSS classes for the container
 */
const PDFDownloadButton = ({ fileName, buttonText = "Download PDF", children, className = "" }) => {
    const contentRef = useRef(null);

    const handleDownload = async () => {
        if (contentRef.current) {
            try {
                await generatePDFFromHTML(contentRef.current, fileName);
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Failed to generate PDF. Please try again.');
            }
        }
    };

    return (
        <div className={className}>
            <div ref={contentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {children}
            </div>
            <button
                onClick={handleDownload}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <Download size={16} />
                {buttonText}
            </button>
        </div>
    );
};

export default PDFDownloadButton;
