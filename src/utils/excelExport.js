import * as XLSX from 'xlsx';
import {
  formatWorkType,
  formatHumanDate,
  formatDateTime,
  formatRelativeDue,
  formatAuthorsHuman,
  parseAuthorsList,
  calculateProgress,
} from './humanize';

/**
 * Universal browser / Electron file download trigger for Excel workbooks
 */
function downloadWorkbook(workbook, fileName) {
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

/**
 * Clean date suffix for filenames
 */
function getDateSuffix(startDate, endDate) {
  if (startDate && endDate) {
    return `${startDate}_to_${endDate}`;
  }
  if (startDate) {
    return `from_${startDate}`;
  }
  if (endDate) {
    return `until_${endDate}`;
  }
  return 'all_time';
}

/**
 * EXPORT 1: Research Manuscripts & Works
 * Exports structured manuscripts portfolio with author details, categories, deadlines, and financial linkage.
 *
 * @param {Array} projects - List of manuscripts/projects
 * @param {Object} options - Filter parameters (startDate, endDate, presetLabel, categoryFilter, searchQuery)
 * @param {Array} payments - Optional payments list to associate fee status & balance with each manuscript
 */
export function exportManuscriptsToExcel(projects = [], options = {}, payments = []) {
  const {
    startDate = '',
    endDate = '',
    presetLabel = 'All Time',
    categoryFilter = 'all',
    searchQuery = '',
  } = options;

  // 1. Precalculate Financial Linkages and High-Level Summaries
  let totalDueMinor = 0;
  let totalReceivedMinor = 0;
  let totalBalanceMinor = 0;

  const statusCounts = {};
  const categoryCounts = {};

  const projectRowsWithFinancials = projects.map((p) => {
    // Category tally
    const cat = p.work_type || 'journal';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Status tally
    const st = p.status || 'In Progress';
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    // Financial link from payments
    let due = 0;
    let rec = 0;
    let bal = 0;
    let hasPayment = false;

    if (Array.isArray(payments) && payments.length > 0) {
      const related = payments.filter((pay) => String(pay.project_id) === String(p.id));
      if (related.length > 0) {
        hasPayment = true;
        due = related.reduce((acc, r) => acc + Number(r.amount_due_minor || 0), 0);
        rec = related.reduce((acc, r) => acc + Number(r.received_minor || 0), 0);
        bal = related.reduce((acc, r) => acc + Number(r.balance_minor || 0), 0);
      }
    }

    totalDueMinor += due;
    totalReceivedMinor += rec;
    totalBalanceMinor += bal;

    let feeStatus = 'No Obligations Recorded';
    if (hasPayment) {
      if (bal <= 0 && due > 0) {
        feeStatus = 'Paid in Full';
      } else if (rec > 0) {
        feeStatus = 'Partially Paid';
      } else {
        feeStatus = 'Pending Settlement';
      }
    }

    return {
      project: p,
      dueMinor: due,
      receivedMinor: rec,
      balanceMinor: bal,
      feeStatus,
    };
  });

  const totalDueINR = Number((totalDueMinor / 100).toFixed(2));
  const totalReceivedINR = Number((totalReceivedMinor / 100).toFixed(2));
  const totalBalanceINR = Number((totalBalanceMinor / 100).toFixed(2));

  // 2. Structured Metadata Header Block
  const metaRows = [
    ['RESEARCH MANAGEMENT SYSTEM - RESEARCH MANUSCRIPTS & WORKS REPORT'],
    ['Generated On:', formatDateTime(new Date())],
    ['Report Scope / Duration Filter:', startDate && endDate ? `${startDate} to ${endDate} (${presetLabel})` : presetLabel],
    ['Category Filter Applied:', categoryFilter === 'all' ? 'All Categories (Journals, Conferences, Patents)' : categoryFilter.toUpperCase()],
    searchQuery ? ['Search Filter Query:', `"${searchQuery}"`] : [],
    [],
    ['EXECUTIVE SUMMARY & PORTFOLIO METRICS'],
    ['Total Manuscripts Included:', projects.length],
    ['Category Breakdown:', `Journals: ${categoryCounts.journal || 0} | Conferences: ${categoryCounts.conference || 0} | Patents: ${categoryCounts.patent || 0}`],
    ['Status Breakdown:', Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'N/A'],
    ['Financial Commitments (INR):', `Total Invoiced: ₹${totalDueINR.toLocaleString('en-IN')} | Received: ₹${totalReceivedINR.toLocaleString('en-IN')} | Outstanding: ₹${totalBalanceINR.toLocaleString('en-IN')}`],
    [],
    [], // Spacer row
  ].filter((row) => row.length > 0);

  // 3. Data Table Headers
  const dataHeaders = [
    '#',
    'Manuscript / Project Title',
    'Category / Type',
    'Work Status',
    'Lead Author / Sponsor',
    'Contributing Co-Authors & Affiliations',
    'Target Venue (Journal / Conference)',
    'Target Deadline',
    'Submission Portal URL',
    'Scope & Abstract Notes',
    'Associated Fee Status',
    'Amount Due (INR)',
    'Received (INR)',
    'Outstanding Balance (INR)',
    'Created Date',
  ];

  // 4. Data Rows with Humanised Logic
  const dataRows = projectRowsWithFinancials.map((item, idx) => {
    const p = item.project;
    const workTypeInfo = formatWorkType(p.work_type);
    const coAuthorsFormatted = formatAuthorsHuman(p.authors);

    return [
      idx + 1,
      p.title || 'Untitled Manuscript',
      workTypeInfo.label || p.work_type || 'Manuscript',
      p.status || 'In Progress',
      p.client_name || 'Independent Researcher',
      coAuthorsFormatted,
      p.target_name || 'Unassigned Venue',
      p.commitment_date ? formatHumanDate(p.commitment_date) : 'Flexible / Ongoing',
      p.target_url || '',
      p.description || '',
      item.feeStatus,
      Number((item.dueMinor / 100).toFixed(2)),
      Number((item.receivedMinor / 100).toFixed(2)),
      Number((item.balanceMinor / 100).toFixed(2)),
      p.created_at ? formatHumanDate(p.created_at) : 'N/A',
    ];
  });

  // 5. Bottom Summary Totals Row
  const totalsRow = [
    'TOTALS',
    `Total Manuscripts: ${projects.length}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalDueINR,
    totalReceivedINR,
    totalBalanceINR,
    '',
  ];

  // 6. Build Sheet and Column Widths
  const fullSheetData = [...metaRows, dataHeaders, ...dataRows, totalsRow];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  worksheet['!cols'] = [
    { wch: 6 },   // #
    { wch: 45 },  // Title
    { wch: 20 },  // Category
    { wch: 16 },  // Status
    { wch: 28 },  // Lead Author
    { wch: 42 },  // Contributing Co-Authors
    { wch: 32 },  // Target Venue
    { wch: 18 },  // Deadline
    { wch: 32 },  // Portal URL
    { wch: 45 },  // Abstract
    { wch: 24 },  // Fee Status
    { wch: 20 },  // Amount Due
    { wch: 20 },  // Received
    { wch: 24 },  // Outstanding Balance
    { wch: 18 },  // Created Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Manuscripts & Works');

  const fileName = `Research_Manuscripts_Works_${getDateSuffix(startDate, endDate)}.xlsx`;
  return downloadWorkbook(workbook, fileName);
}

/**
 * EXPORT 2: Invoicing & Payment Follow-up Ledger
 * Exports fee schedules, settlement balances, schedule urgencies, and client milestones.
 *
 * @param {Array} payments - List of payment obligations/invoices
 * @param {Object} options - Filter parameters (startDate, endDate, presetLabel, statusFilter, searchQuery)
 */
export function exportInvoicingLedgerToExcel(payments = [], options = {}) {
  const {
    startDate = '',
    endDate = '',
    presetLabel = 'All Time',
    statusFilter = 'all',
    searchQuery = '',
  } = options;

  // 1. High-level KPI aggregations
  let totalDueMinor = 0;
  let totalReceivedMinor = 0;
  let totalBalanceMinor = 0;
  let overdueCount = 0;
  let settledCount = 0;
  let pendingCount = 0;

  payments.forEach((pay) => {
    totalDueMinor += Number(pay.amount_due_minor || 0);
    totalReceivedMinor += Number(pay.received_minor || 0);
    totalBalanceMinor += Number(pay.balance_minor || 0);

    if (pay.due_state === 'Overdue') overdueCount++;
    else if (pay.due_state === 'Paid' || pay.balance_minor <= 0) settledCount++;
    else pendingCount++;
  });

  const totalDueINR = Number((totalDueMinor / 100).toFixed(2));
  const totalReceivedINR = Number((totalReceivedMinor / 100).toFixed(2));
  const totalBalanceINR = Number((totalBalanceMinor / 100).toFixed(2));

  // 2. Structured Metadata Header Block
  const metaRows = [
    ['RESEARCH MANAGEMENT SYSTEM - INVOICING & PAYMENT FOLLOW-UP LEDGER'],
    ['Generated On:', formatDateTime(new Date())],
    ['Duration / Date Filter:', startDate && endDate ? `${startDate} to ${endDate} (${presetLabel})` : presetLabel],
    ['Status Filter:', statusFilter === 'all' ? 'All Records' : statusFilter.toUpperCase()],
    searchQuery ? ['Search Filter Query:', `"${searchQuery}"`] : [],
    [],
    ['LEDGER FINANCIAL SUMMARY & MILESTONES AUDIT'],
    ['Total Invoices / Milestones:', payments.length],
    ['Settlement Breakdown:', `Fully Settled: ${settledCount} | Overdue: ${overdueCount} | Pending: ${pendingCount}`],
    ['Total Fee Commitments (INR):', `Invoiced Due: ₹${totalDueINR.toLocaleString('en-IN')} | Received: ₹${totalReceivedINR.toLocaleString('en-IN')} | Remaining: ₹${totalBalanceINR.toLocaleString('en-IN')}`],
    [],
    [], // Spacer row
  ].filter((row) => row.length > 0);

  // 3. Data Table Headers
  const dataHeaders = [
    '#',
    'Milestone / Invoice ID',
    'Client / Collaborator',
    'Associated Manuscript Title',
    'Fee Description / Milestone',
    'Target Schedule Date',
    'Schedule Urgency / Status',
    'Payment Status',
    'Settlement Progress %',
    'Amount Due (INR)',
    'Amount Received (INR)',
    'Remaining Balance (INR)',
    'Creation Date',
  ];

  // 4. Data Rows with Humanised Logic
  const dataRows = payments.map((pay, idx) => {
    const relative = formatRelativeDue(pay.due_date, pay.due_state);
    const progress = calculateProgress(pay.received_minor, pay.amount_due_minor);
    const isSettled = (pay.balance_minor || 0) <= 0 || pay.due_state === 'Paid';

    return [
      idx + 1,
      `PAY-${pay.id}`,
      pay.client_name || 'Client',
      pay.project_title || 'General Account',
      pay.description || 'Milestone Obligation',
      pay.due_date ? formatHumanDate(pay.due_date) : 'Flexible Schedule',
      relative.text,
      isSettled ? 'Settled in Full' : pay.due_state || 'Pending',
      `${progress}%`,
      Number(((pay.amount_due_minor || 0) / 100).toFixed(2)),
      Number(((pay.received_minor || 0) / 100).toFixed(2)),
      Number(((pay.balance_minor || 0) / 100).toFixed(2)),
      pay.created_at ? formatHumanDate(pay.created_at) : 'N/A',
    ];
  });

  // 5. Bottom Summary Totals Row
  const totalsRow = [
    'TOTALS',
    `Total Records: ${payments.length}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalDueINR,
    totalReceivedINR,
    totalBalanceINR,
    '',
  ];

  // 6. Build Sheet and Column Widths
  const fullSheetData = [...metaRows, dataHeaders, ...dataRows, totalsRow];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  worksheet['!cols'] = [
    { wch: 6 },   // #
    { wch: 18 },  // Invoice ID
    { wch: 28 },  // Client
    { wch: 42 },  // Manuscript Title
    { wch: 32 },  // Fee Description
    { wch: 20 },  // Schedule Date
    { wch: 26 },  // Urgency
    { wch: 18 },  // Payment Status
    { wch: 16 },  // Progress %
    { wch: 20 },  // Amount Due
    { wch: 20 },  // Amount Received
    { wch: 24 },  // Remaining Balance
    { wch: 18 },  // Created At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoicing Ledger');

  const fileName = `Invoicing_Payment_Ledger_${getDateSuffix(startDate, endDate)}.xlsx`;
  return downloadWorkbook(workbook, fileName);
}

/**
 * EXPORT 3: Payment Transaction History
 * Exports chronological audit log of all received receipts with vouchers and references.
 *
 * @param {Array} paymentHistory - List of payment receipts/transactions
 * @param {Object} options - Filter parameters (startDate, endDate, presetLabel, searchQuery)
 */
export function exportTransactionHistoryToExcel(paymentHistory = [], options = {}) {
  const {
    startDate = '',
    endDate = '',
    presetLabel = 'All Time',
    searchQuery = '',
  } = options;

  // 1. Calculations
  let totalCollectedMinor = 0;
  const uniqueClients = new Set();

  paymentHistory.forEach((tx) => {
    totalCollectedMinor += Number(tx.amount_minor || 0);
    if (tx.client_name) uniqueClients.add(tx.client_name);
  });

  const totalCollectedINR = Number((totalCollectedMinor / 100).toFixed(2));

  // 2. Structured Metadata Header Block
  const metaRows = [
    ['RESEARCH MANAGEMENT SYSTEM - PAYMENT TRANSACTION AUDIT LEDGER'],
    ['Generated On:', formatDateTime(new Date())],
    ['Audit Period / Date Filter:', startDate && endDate ? `${startDate} to ${endDate} (${presetLabel})` : presetLabel],
    searchQuery ? ['Search Filter Query:', `"${searchQuery}"`] : [],
    [],
    ['TRANSACTION AUDIT REVENUE SUMMARY'],
    ['Total Receipts Recorded:', paymentHistory.length],
    ['Unique Collaborators / Clients:', uniqueClients.size],
    ['Total Revenue Collected (INR):', `₹${totalCollectedINR.toLocaleString('en-IN')}`],
    [],
    [], // Spacer row
  ].filter((row) => row.length > 0);

  // 3. Data Table Headers
  const dataHeaders = [
    '#',
    'Receipt Voucher #',
    'Payment Receipt Date',
    'Client / Collaborator',
    'Associated Manuscript',
    'Fee Milestone Settled',
    'Collected Amount (INR)',
    'Payment Mode / Audit Reference',
    'Recorded In System',
  ];

  // 4. Data Rows with Humanised Logic
  const dataRows = paymentHistory.map((tx, idx) => {
    const txDate = tx.paid_at || tx.created_at;

    return [
      idx + 1,
      `REC-${tx.id}`,
      txDate ? formatHumanDate(txDate) : 'Recorded',
      tx.client_name || 'Client',
      tx.project_title || 'General Account',
      tx.payment_description || 'Direct Milestone Settlement',
      Number(((tx.amount_minor || 0) / 100).toFixed(2)),
      tx.notes || 'Direct payment recorded',
      tx.created_at ? formatDateTime(tx.created_at) : 'N/A',
    ];
  });

  // 5. Bottom Summary Totals Row
  const totalsRow = [
    'TOTAL COLLECTED',
    `Total Receipts: ${paymentHistory.length}`,
    '',
    '',
    '',
    '',
    totalCollectedINR,
    '',
    '',
  ];

  // 6. Build Sheet and Column Widths
  const fullSheetData = [...metaRows, dataHeaders, ...dataRows, totalsRow];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  worksheet['!cols'] = [
    { wch: 6 },   // #
    { wch: 20 },  // Receipt #
    { wch: 22 },  // Receipt Date
    { wch: 28 },  // Client
    { wch: 42 },  // Manuscript Title
    { wch: 30 },  // Fee Milestone
    { wch: 24 },  // Collected Amount (INR)
    { wch: 40 },  // Notes / Reference
    { wch: 22 },  // System Timestamp
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Transactions');

  const fileName = `Payment_Transaction_History_${getDateSuffix(startDate, endDate)}.xlsx`;
  return downloadWorkbook(workbook, fileName);
}

/**
 * EXPORT 4: Collaborator Works Dossier (Preserved for ClientsView)
 */
export function exportCollaboratorWorksToExcel(collaborator, works = [], options = {}) {
  const { startDate = '', endDate = '', presetLabel = 'All Time' } = options;

  // 1. Report Metadata Header Block
  const metaRows = [
    ['RESEARCH MANAGEMENT SYSTEM - COLLABORATOR DOSSIER REPORT'],
    ['Generated On:', formatDateTime(new Date())],
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
      work.paymentInfo?.amountDue ? Number((work.paymentInfo.amountDue / 100).toFixed(2)) : '—',
      work.paymentInfo?.received ? Number((work.paymentInfo.received / 100).toFixed(2)) : '—',
      work.paymentInfo?.balance ? Number((work.paymentInfo.balance / 100).toFixed(2)) : '—',
      work.created_at ? formatHumanDate(work.created_at) : '',
    ];
  });

  // 4. Combine into complete sheet array
  const fullSheetData = [...metaRows, dataHeaders, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // 5. Setup Column Widths
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Collaborator Works');

  const cleanName = (collaborator.name || 'collaborator').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanName}_works_${getDateSuffix(startDate, endDate)}.xlsx`;

  return downloadWorkbook(workbook, fileName);
}
