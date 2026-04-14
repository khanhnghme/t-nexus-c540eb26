import { format } from 'date-fns';
import type jsPDFType from 'jspdf';
import ettLogoUrl from '@/assets/t-nexus-text.png';

// ETT Brand Colors
const ETT_TEAL: [number, number, number] = [26, 107, 109]; // #1A6B6D
const ETT_ORANGE: [number, number, number] = [224, 123, 57]; // #E07B39
const ETT_TEAL_LIGHT: [number, number, number] = [230, 243, 243]; // Light teal for alternating rows

interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

// Load image as base64 with dimensions
const loadImageAsBase64 = (url: string): Promise<PdfImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

interface ActivityLog {
  id: string;
  action: string;
  action_type: string;
  description: string | null;
  user_name: string;
  created_at: string;
}

interface ExportOptions {
  projectName: string;
  logs: ActivityLog[];
  dateFrom?: Date;
  dateTo?: Date;
  filters?: {
    actionType?: string;
    action?: string;
    userName?: string;
  };
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  member: 'Thanh vien',
  stage: 'Giai doan',
  task: 'Task',
  resource: 'Tai nguyen',
  score: 'Diem',
  project: 'Du an',
  setting: 'Cai dat',
};

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'ADD_MEMBER': 'Them thanh vien',
    'REMOVE_MEMBER': 'Xoa thanh vien',
    'UPDATE_MEMBER': 'Cap nhat thanh vien',
    'CREATE_AND_ADD_MEMBER': 'Tao va them thanh vien',
    'CREATE_STAGE': 'Tao giai doan',
    'UPDATE_STAGE': 'Cap nhat giai doan',
    'DELETE_STAGE': 'Xoa giai doan',
    'CREATE_TASK': 'Tao task',
    'UPDATE_TASK': 'Cap nhat task',
    'DELETE_TASK': 'Xoa task',
    'SUBMISSION': 'Nop bai',
    'LATE_SUBMISSION': 'Nop bai tre',
  };
  return actionMap[action] || action;
};

// Remove Vietnamese diacritics for PDF compatibility
const removeVietnameseDiacritics = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

// Add UEH Header with actual logo
const addUEHHeader = async (doc: jsPDF, pageWidth: number): Promise<number> => {
  try {
    const logo = await loadImageAsBase64(ettLogoUrl);
    const logoWidth = 45;
    const logoHeight = logoWidth * (logo.height / logo.width); // Keep aspect ratio
    doc.addImage(logo.dataUrl, 'PNG', 14, 8, logoWidth, logoHeight);
    
    // Decorative line below logo
    const lineY = 10 + logoHeight + 2;
    doc.setDrawColor(...ETT_TEAL);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, pageWidth - 14, lineY);
    
    // Orange accent line
    doc.setDrawColor(...ETT_ORANGE);
    doc.setLineWidth(2);
    doc.line(14, lineY + 2, 45, lineY + 2);
    
    return lineY + 6; // Return Y position after header
  } catch (error) {
    console.error('Failed to load UEH logo, using text fallback:', error);
    // Fallback to text if image fails
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ETT_TEAL);
    doc.text('UEH', 14, 16);
    
    doc.setFontSize(8);
    doc.setTextColor(...ETT_ORANGE);
    doc.text('UNIVERSITY', 14, 21);
    
    doc.setDrawColor(...ETT_TEAL);
    doc.setLineWidth(0.5);
    doc.line(14, 24, pageWidth - 14, 24);
    
    doc.setDrawColor(...ETT_ORANGE);
    doc.setLineWidth(2);
    doc.line(14, 26, 45, 26);
    
    return 30; // Return Y position after header
  }
};

export const exportActivityLogToPdf = async ({ projectName, logs, dateFrom, dateTo, filters }: ExportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add UEH Header (async for loading logo) - returns Y position after header
  const headerEndY = await addUEHHeader(doc, pageWidth);
  
  // Title - positioned dynamically based on header
  const titleY = headerEndY + 8;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ETT_TEAL);
  const title = removeVietnameseDiacritics(`NHAT KY HOAT DONG`);
  doc.text(title, pageWidth / 2, titleY, { align: 'center' });
  
  // Project name
  const projectNameY = titleY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(removeVietnameseDiacritics(projectName), pageWidth / 2, projectNameY, { align: 'center' });
  
  // Filter info box
  let yPos = projectNameY + 8;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos - 4, pageWidth - 28, 20, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  // Date range
  let dateRangeText = 'Thoi gian: Tat ca';
  if (dateFrom && dateTo) {
    dateRangeText = `Thoi gian: ${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`;
  } else if (dateFrom) {
    dateRangeText = `Thoi gian: Tu ${format(dateFrom, 'dd/MM/yyyy')}`;
  } else if (dateTo) {
    dateRangeText = `Thoi gian: Den ${format(dateTo, 'dd/MM/yyyy')}`;
  }
  doc.text(dateRangeText, 18, yPos + 3);
  
  // Total records
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ETT_TEAL);
  doc.text(`Tong so: ${logs.length} hoat dong`, pageWidth - 18, yPos + 3, { align: 'right' });
  
  // Export timestamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Xuat luc: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 18, yPos + 11);
  
  // Table data
  const tableData = logs.map((log, index) => [
    (index + 1).toString(),
    format(new Date(log.created_at), 'dd/MM/yyyy'),
    format(new Date(log.created_at), 'HH:mm:ss'),
    removeVietnameseDiacritics(log.user_name.split('@')[0]),
    ACTION_TYPE_LABELS[log.action_type] || log.action_type,
    removeVietnameseDiacritics(formatAction(log.action)),
    removeVietnameseDiacritics(log.description || '-'),
  ]);
  
  // Generate table with UEH colors
  autoTable(doc, {
    head: [['STT', 'Ngay', 'Gio', 'Nguoi thuc hien', 'Loai', 'Hanh dong', 'Mo ta']],
    body: tableData,
    startY: yPos + 18,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: ETT_TEAL,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 30 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 30 },
      6: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: ETT_TEAL_LIGHT,
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = data.pageNumber;
      
      // Footer line
      doc.setDrawColor(...ETT_TEAL);
      doc.setLineWidth(0.3);
      doc.line(14, doc.internal.pageSize.getHeight() - 15, pageWidth - 14, doc.internal.pageSize.getHeight() - 15);
      
      // Footer with page number and UEH branding
      doc.setFontSize(8);
      doc.setTextColor(...ETT_TEAL);
      doc.setFont('helvetica', 'bold');
      doc.text('UEH', 14, doc.internal.pageSize.getHeight() - 8);
      
      doc.setTextColor(...ETT_ORANGE);
      doc.setFontSize(6);
      doc.text('UNIVERSITY', 24, doc.internal.pageSize.getHeight() - 8);
      
      // Page number
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Trang ${currentPage} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
      
      // Timestamp on right
      doc.text(
        format(new Date(), 'dd/MM/yyyy'),
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' }
      );
    },
  });
  
  // Save the PDF
  const fileName = `nhat-ky-hoat-dong-${removeVietnameseDiacritics(projectName).toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  doc.save(fileName);
};
