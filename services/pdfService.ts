
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element to a PDF file.
 * Uses html2canvas for capturing a high-resolution image of the content 
 * to ensure correct rendering of Chinese characters and layout.
 */
export const exportToPDF = async (elementId: string, filename: string) => {
  console.log(`[PDF Service] Attempting to export element: #${elementId}`);
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`[PDF Service] Target element #${elementId} not found in DOM.`);
    return;
  }

  try {
    console.log(`[PDF Service] Starting html2canvas capture...`);
    
    // Temporarily hide interactive elements that shouldn't be in the PDF
    const interactiveElements = element.querySelectorAll('button, .no-export');
    interactiveElements.forEach(el => (el as HTMLElement).style.opacity = '0');

    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x resolution for print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: -window.scrollY, // Fix offset issues if page is scrolled
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    // Restore visibility of interactive elements
    interactiveElements.forEach(el => (el as HTMLElement).style.opacity = '');
    console.log(`[PDF Service] Canvas created: ${canvas.width}x${canvas.height}`);

    const imgData = canvas.toDataURL('image/png');
    
    // PDF dimensions matching the captured canvas at original scale
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height / 2);

    console.log(`[PDF Service] Generating PDF document...`);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Trigger download
    console.log(`[PDF Service] Triggering file download: ${filename}`);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    
    console.log(`[PDF Service] Export successful.`);
    return true;
  } catch (error) {
    console.error('[PDF Service] PDF generation failed:', error);
    // Cleanup visibility in case of error
    const interactiveElements = element.querySelectorAll('button, .no-export');
    interactiveElements.forEach(el => (el as HTMLElement).style.opacity = '');
    throw error;
  }
};
