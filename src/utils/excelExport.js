import * as XLSX from 'xlsx';
import { formatWorkType, formatHumanDate, parseAuthorsList } from './humanize';

/**
 * Exports collaborator's research works to an Excel (.xlsx) file with custom duration.
 *
 * @param {Object} collaborator - Collaborator details (name, organization, email, phone)
 * @param {Array} works - Array of research work projects with involvement role and payment info
 * @param {Object} options - Filter options (startDate, endDate, presetLabel)
 */
export function exportCollaboratorWorksToExcel(collaborator, works = [], options = {}) {
  const { startDate = '', endDate = '', presetLabel = 'All Time' } = options;

  // 1. Report Metadata Header Block
  const metaRows = [
    ['RESEARCH MANAGEMENT SYSTEM - COLLABORATOR DOSSIER REPORT'],
    ['Generated On:', new Date().toLocaleString()],
    [],
    ['COLLABORATOR PROFILE'],
    ['Full Name / Title:', collaborator.name || 'Unknown Collaborator'],
    ['Affiliation / Institution:', collaborator.organization || 'Independent Researcher'],
    ['Primary Email:', collaborator.email || 'N/A'],
    ['Phone Contact:', collaborator.phone || 'N/A'],
    ['Research Context:', collaborator.notes || 'N/A'],
    [],
    ['FILTER & REPORT SCOPE'],
    ['Duration Filter:', startDate && endDate ? `${startDate} to ${endDate} (${presetLabel})` : presetLabel],
    ['Total Works Included:', works.length],
    [],
    [], // Spacer before data table
  ];

  // 2. Data Table Column Headers
  const dataHeaders = [
    '#',
    'Manuscript / Project Title',
    'Category',
    'Collaborator Involvement Role',
    'Lead Author / Sponsor',
    'Contributing Co-Authors',
    'Target Journal / Conference',
    'Target Deadline',
    'Work Status',
    'Submission / Portal URL',
    'Research Abstract & Scope Notes',
    'Associated Payment Status',
    'Payment Amount Due (INR)',
    'Payment Received (INR)',
    'Outstanding Balance (INR)',
    'Created At',
  ];

  // 3. Populate Data Rows
  const dataRows = works.map((work, idx) => {
    const authorsArr = parseAuthorsList(work.authors);
    const coAuthorsStr = authorsArr.length > 0 ? authorsArr.join('; ') : 'Lead Author Only';
    const workTypeLabel = formatWorkType(work.work_type).label || work.work_type;

    return [
      idx + 1,
      work.title || '',
      workTypeLabel,
      work.involvementRole || 'Involved Author',
      work.client_name || collaborator.name || '',
      coAuthorsStr,
      work.target_name || '',
      work.commitment_date ? formatHumanDate(work.commitment_date) : 'Flexible',
      work.status || 'In Progress',
      work.target_url || '',
      work.description || '',
      work.paymentInfo?.status || (work.involvementRole?.includes('Lead') ? 'No Obligations Recorded' : 'N/A (Co-Author)'),
      work.paymentInfo?.amountDue ? (work.paymentInfo.amountDue / 100).toFixed(2) : '—',
      work.paymentInfo?.received ? (work.paymentInfo.received / 100).toFixed(2) : '—',
      work.paymentInfo?.balance ? (work.paymentInfo.balance / 100).toFixed(2) : '—',
      work.created_at ? formatHumanDate(work.created_at) : '',
    ];
  });

  // 4. Combine into complete sheet array
  const fullSheetData = [...metaRows, dataHeaders, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // 5. Setup Column Widths for readability
  worksheet['!cols'] = [
    { wch: 6 },   // #
    { wch: 45 },  // Title
    { wch: 22 },  // Category
    { wch: 28 },  // Role
    { wch: 25 },  // Lead Author
    { wch: 35 },  // Co-authors
    { wch: 30 },  // Target Journal/Conference
    { wch: 18 },  // Deadline
    { wch: 15 },  // Status
    { wch: 35 },  // Portal URL
    { wch: 50 },  // Abstract
    { wch: 26 },  // Payment Status
    { wch: 24 },  // Amount Due
    { wch: 24 },  // Received
    { wch: 24 },  // Balance
    { wch: 18 },  // Created At
  ];

  // 6. Create Workbook and Append Sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Collaborator Works');

  // 7. Format clean safe filename
  const cleanName = (collaborator.name || 'collaborator').replace(/[^a-zA-Z0-9]/g, '_');
  const dateRangeSuffix = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
  const fileName = `${cleanName}_works_${dateRangeSuffix}.xlsx`;

  // 8. Trigger binary download
  try {
    if (typeof window !== 'undefined' && window.document) {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 300);
      return fileName;
    }
    XLSX.writeFile(workbook, fileName);
    return fileName;
  } catch (err) {
    console.error('Error generating Excel file:', err);
    XLSX.writeFile(workbook, fileName);
    return fileName;
  }
}
