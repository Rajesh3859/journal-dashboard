import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
} from '@mui/material';

import MainLayout from './layouts/MainLayout';
import DashboardView from './pages/DashboardView';
import ClientsView from './pages/ClientsView';
import ProjectsView from './pages/ProjectsView';
import PaymentsView from './pages/PaymentsView';
import HistoryView from './pages/HistoryView';
import BackupRestoreView from './pages/BackupRestoreView';
import { createAuthorRecord } from './utils/security';

// Research Paper Trading Dashboard Views
import TradingDashboardView from './pages/trading/TradingDashboardView';
import TradingPurchasesView from './pages/trading/TradingPurchasesView';
import TradingSalesView from './pages/trading/TradingSalesView';
import TradingBalancesView from './pages/trading/TradingBalancesView';
import TradingReportsView from './pages/trading/TradingReportsView';
import TradingHistoryView from './pages/trading/TradingHistoryView';
import TradingBackupView from './pages/trading/TradingBackupView';
import tradingService from './services/tradingService';

const createAppTheme = (mode, fontScale = 1) =>
  responsiveFontSizes(
    createTheme({
      palette: {
        mode,
        primary: {
          main: mode === 'dark' ? '#5B8DEF' : '#2457A7',
          light: mode === 'dark' ? '#7CA6F5' : '#4C7AC7',
          dark: mode === 'dark' ? '#1D4589' : '#173A73',
        },
        background: {
          default: mode === 'dark' ? '#0B132B' : '#F5F7FB',
          paper: mode === 'dark' ? '#1C2541' : '#FFFFFF',
        },
        text: {
          primary: mode === 'dark' ? '#F1F5F9' : '#1E293B',
          secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
        },
        divider: mode === 'dark' ? '#334155' : '#E2E8F0',
      },
      shape: { borderRadius: 7 },
      typography: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        fontSize: 15,
        h4: { fontWeight: 800, fontSize: '1.9rem' },
        h5: { fontWeight: 750, fontSize: '1.5rem' },
        h6: { fontWeight: 700, fontSize: '1.2rem' },
        subtitle1: { fontSize: '1.02rem' },
        subtitle2: { fontSize: '0.92rem' },
        body1: { fontSize: '0.96rem' },
        body2: { fontSize: '0.88rem' },
        caption: { fontSize: '0.82rem' },
      },
      components: {
        MuiModal: {
          defaultProps: {
            disableScrollLock: true,
          },
        },
        MuiMenu: {
          defaultProps: {
            disableScrollLock: true,
          },
        },
        MuiPopover: {
          defaultProps: {
            disableScrollLock: true,
          },
        },
        MuiDialog: {
          defaultProps: {
            disableScrollLock: true,
          },
        },
        MuiSelect: {
          defaultProps: {
            MenuProps: {
              disableScrollLock: true,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
              borderColor: mode === 'dark' ? '#334155' : '#E2E8F0',
              boxShadow:
                mode === 'dark'
                  ? '0 4px 20px -2px rgba(0,0,0,0.5)'
                  : '0 2px 12px -2px rgba(0,0,0,0.05)',
            },
          },
        },
        MuiCardContent: {
          styleOverrides: {
            root: {
              padding: '18px',
              '&:last-child': {
                paddingBottom: '18px',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: '7px',
              fontWeight: 600,
              fontSize: '0.92rem',
              minHeight: '2.2em',
              lineHeight: 1.3,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
              fontSize: '0.94rem',
            },
            input: {
              padding: '0.65em 0.85em',
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              fontSize: '0.92rem',
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
              fontSize: '0.9rem',
              padding: '8px 16px',
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
              fontSize: '0.82rem',
              height: 'auto',
              minHeight: '1.6em',
              paddingTop: '2px',
              paddingBottom: '2px',
            },
            label: {
              paddingLeft: '8px',
              paddingRight: '8px',
              lineHeight: 1.25,
            },
          },
        },
        MuiDataGrid: {
          styleOverrides: {
            root: {
              borderRadius: '7px',
              fontSize: '0.92rem',
            },
            cell: {
              padding: '0 12px',
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1.35,
              '&:focus, &:focus-within': {
                outline: 'none !important',
              },
            },
            columnHeader: {
              padding: '0 12px',
              fontSize: '0.92rem',
              '&:focus, &:focus-within': {
                outline: 'none !important',
              },
            },
            columnHeaderTitle: {
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          },
        },
      },
    })
  );

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyClient = {
  name: '',
  organization: '',
  email: '',
  phone: '',
  notes: '',
};

const emptyProject = {
  clientId: '',
  title: '',
  workType: 'journal',
  commitmentDate: '',
  targetName: '',
  targetUrl: '',
  description: '',
  authors: [],
};

const emptyObligation = {
  projectId: '',
  description: 'Client payment',
  amountDue: '',
  dueDate: '',
};

const emptyReceipt = {
  obligationId: '',
  amount: '',
  paymentDate: today(),
  notes: '',
};

const money = (minor) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(minor || 0) / 100);

const dueColor = (state) => {
  if (state === 'Overdue') return 'error';
  if (state === 'Due today') return 'warning';
  if (state === 'Paid') return 'success';
  return 'default';
};

const TAB_METADATA = {
  dashboard: {
    title: 'Research Workspace Overview',
    subtitle: 'Track research manuscripts, project milestones, and client accounts in one workspace',
  },
  clients: {
    title: 'Collaborators & Authors Directory',
    subtitle: 'Manage academic researchers, institutional partners, and project sponsors',
  },
  projects: {
    title: 'Research Works & Manuscripts',
    subtitle: 'Track ongoing papers, journal publications, conference proceedings, and patents',
  },
  payments: {
    title: 'Invoicing & Milestone Follow-up',
    subtitle: 'Monitor fee agreements, milestone collection progress, and client balances',
  },
  history: {
    title: 'Payment Receipts & Transactions',
    subtitle: 'Real-time record of all client funds received and deposited',
  },
  backup: {
    title: 'Backup & Restore Center',
    subtitle: 'Automated weekly snapshots, custom storage locations, and verified workspace recovery',
  },
};

const TRADING_TAB_METADATA = {
  trading_dashboard: {
    title: 'Trading Dashboard',
    subtitle: '',
  },
  trading_purchases: {
    title: 'Paper Purchases',
    subtitle: '',
  },
  trading_sales: {
    title: 'Paper Sales',
    subtitle: '',
  },
  trading_balances: {
    title: 'Payables & Receivables',
    subtitle: '',
  },
  trading_reports: {
    title: 'Profit & Financials',
    subtitle: '',
  },
  trading_history: {
    title: 'Transaction History',
    subtitle: '',
  },
  trading_backup: {
    title: 'Backup & Restore',
    subtitle: '',
  },
};

export default function App() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('rm_theme_mode') || 'light';
  });

  // Dynamic user-controlled font scale state (1.0 = 100%)
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('rm_font_scale');
    const parsed = saved ? parseFloat(saved) : 1.0;
    return !Number.isNaN(parsed) && parsed >= 0.8 && parsed <= 1.4 ? parsed : 1.0;
  });

  // Workspace Mode: 'research' (Research Management) or 'trading' (Research Paper Trading)
  const [workspace, setWorkspace] = useState(() => {
    return localStorage.getItem('rm_active_workspace') || 'research';
  });

  const [activeTab, setActiveTab] = useState(() => {
    const savedWs = localStorage.getItem('rm_active_workspace') || 'research';
    return savedWs === 'trading' ? 'trading_dashboard' : 'dashboard';
  });

  // Research Management Data State
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Research Paper Trading Data State
  const [tradingPurchases, setTradingPurchases] = useState([]);
  const [tradingSales, setTradingSales] = useState([]);
  const [tradingBalances, setTradingBalances] = useState({ sellerPayables: [], buyerReceivables: [] });
  const [tradingFinancials, setTradingFinancials] = useState({});
  const [tradingTransactions, setTradingTransactions] = useState([]);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [openTradingPurchaseModal, setOpenTradingPurchaseModal] = useState(false);
  const [openTradingSaleModal, setOpenTradingSaleModal] = useState(false);

  const [clientForm, setClientForm] = useState(emptyClient);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [obligationForm, setObligationForm] = useState(emptyObligation);
  const [receiptForm, setReceiptForm] = useState(emptyReceipt);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Sync font scale CSS variable with the HTML root element
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', String(fontScale));
    localStorage.setItem('rm_font_scale', String(fontScale));
  }, [fontScale]);

  const handleIncreaseFontSize = () => {
    setFontScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))));
  };

  const handleDecreaseFontSize = () => {
    setFontScale((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))));
  };

  const handleResetFontSize = () => {
    setFontScale(1.0);
  };

  const handleCloseError = (event, reason) => {
    if (reason === 'clickaway') return;
    setError('');
  };

  const handleCloseSuccess = (event, reason) => {
    if (reason === 'clickaway') return;
    setSuccess('');
  };

  const theme = useMemo(() => createAppTheme(mode, fontScale), [mode, fontScale]);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('rm_theme_mode', next);
      return next;
    });
  };

  async function refreshData() {
    if (!window.desktopAPI) {
      // Standalone browser preview: load realistic mock data
      setClients([
        { id: 1, name: 'Dr. Aris Thorne', organization: 'MIT Bioengineering Labs', email: 'a.thorne@mit.edu', phone: '+1-617-555-0192', orcid: '0000-0002-1825-0097' },
        { id: 2, name: 'Prof. Elena Rostova', organization: 'Oxford Genomics Institute', email: 'elena.r@ox.ac.uk', phone: '+44-1865-550182', orcid: '0000-0001-5109-3700' },
        { id: 3, name: 'Dr. Marcus Vance', organization: 'Max Planck Institute', email: 'm.vance@mpg.de', phone: '+49-89-32990', orcid: '0000-0003-2490-8321' },
      ]);
      const storedProjects = localStorage.getItem('rm_browser_projects');
      if (storedProjects) {
        try {
          setProjects(JSON.parse(storedProjects));
        } catch {
          setProjects([]);
        }
      } else {
        setProjects([
          {
            id: 1,
            client_id: 1,
            client_name: 'Dr. Aris Thorne',
            client_email: 'a.thorne@mit.edu',
            client_organization: 'MIT Bioengineering Labs',
            lead_orcid: '0000-0002-1825-0097',
            title: 'Deep Learning Approaches in CRISPR Genomic Variant Discovery',
            work_type: 'journal',
            target_name: 'Nature Biotechnology',
            commitment_date: '2026-11-15',
            authors: [
              createAuthorRecord({
                name: 'Dr. Sarah Connor',
                email: 's.connor@cyberdyne.org',
                password: 'Auth@Sarah2026!',
                role: 'Co-Author',
                affiliation: 'Cyberdyne AI Research',
                orcid: '0000-0003-4412-8951',
              }),
              createAuthorRecord({
                name: 'Prof. John Doe',
                email: 'j.doe@stanford.edu',
                password: 'Auth@John2026!',
                role: 'Corresponding Author',
                affiliation: 'Stanford Genomics Lab',
                orcid: '0000-0002-9811-0422',
              }),
            ],
          },
          {
            id: 2,
            client_id: 2,
            client_name: 'Prof. Elena Rostova',
            client_email: 'elena.r@ox.ac.uk',
            client_organization: 'Oxford Genomics Institute',
            lead_orcid: '0000-0001-5109-3700',
            title: 'Automated Neural Micrograph Segmentation at Scale',
            work_type: 'conference',
            target_name: 'CVPR 2026',
            commitment_date: '2026-12-01',
            authors: [
              createAuthorRecord({
                name: 'Dr. Marcus Vance',
                email: 'm.vance@mpg.de',
                password: 'Auth@Vance2026!',
                role: 'Co-Author',
                affiliation: 'Max Planck Institute',
                orcid: '0000-0003-2490-8321',
              }),
            ],
          },
        ]);
      }
      setPayments([
        {
          id: 1,
          project_id: 1,
          client_name: 'Dr. Aris Thorne',
          project_title: 'Deep Learning Approaches in CRISPR Genomic Variant Discovery',
          description: 'Drafting milestone & peer review response',
          amount_due_minor: 2500000,
          received_minor: 1000000,
          balance_minor: 1500000,
          due_date: '2026-04-10',
          due_state: 'Overdue',
          status: 'Pending',
        },
        {
          id: 2,
          project_id: 2,
          client_name: 'Prof. Elena Rostova',
          project_title: 'Automated Neural Micrograph Segmentation at Scale',
          description: 'Open access article processing charge (APC)',
          amount_due_minor: 1800000,
          received_minor: 0,
          balance_minor: 1800000,
          due_date: today(),
          due_state: 'Due today',
          status: 'Pending',
        },
      ]);
      setPaymentHistory([
        {
          id: 101,
          client_name: 'Dr. Aris Thorne',
          project_title: 'Deep Learning Approaches in CRISPR Genomic Variant Discovery',
          payment_description: 'Initial deposit & retainer',
          amount_minor: 1000000,
          payment_date: '2026-03-01',
          notes: 'Wire transfer ref #WT-894201',
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [c, p, pay, history] = await Promise.all([
        window.desktopAPI.listClients(),
        window.desktopAPI.listProjects(),
        window.desktopAPI.listPayments(),
        window.desktopAPI.listPaymentHistory(),
      ]);

      setClients(c || []);
      setProjects(p || []);
      setPayments(pay || []);
      setPaymentHistory(history || []);
    } catch (err) {
      setError(err.message || 'Failed to refresh records.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshTradingData() {
    setTradingLoading(true);
    try {
      const [purchases, sales, balances, financials, transactions] = await Promise.all([
        tradingService.listPurchases(),
        tradingService.listSales(),
        tradingService.getBalances(),
        tradingService.getFinancials(),
        tradingService.getUnifiedTransactions(),
      ]);

      setTradingPurchases(purchases || []);
      setTradingSales(sales || []);
      setTradingBalances(balances || { sellerPayables: [], buyerReceivables: [] });
      setTradingFinancials(financials || {});
      setTradingTransactions(transactions || []);
    } catch (err) {
      console.error('Failed to load trading records:', err);
    } finally {
      setTradingLoading(false);
    }
  }

  useEffect(() => {
    refreshData().catch((err) => setError(err.message || 'Failed to load records.'));
    refreshTradingData().catch((err) => console.error('Trading load error:', err));
  }, []);

  const handleToggleWorkspace = (newWorkspace) => {
    setWorkspace(newWorkspace);
    localStorage.setItem('rm_active_workspace', newWorkspace);
    if (newWorkspace === 'trading') {
      if (!activeTab.startsWith('trading_')) {
        setActiveTab('trading_dashboard');
      }
      refreshTradingData();
    } else {
      if (activeTab.startsWith('trading_')) {
        setActiveTab('dashboard');
      }
      refreshData();
    }
  };

  // Trading Action Handlers
  async function runTradingAction(action, successMessage) {
    setError('');
    setSuccess('');
    try {
      await action();
      await refreshTradingData();
      if (successMessage) setSuccess(successMessage);
    } catch (err) {
      setError(err.message || 'Trading operation failed.');
      throw err;
    }
  }

  const handleSaveTradingPurchase = async (purchaseData) => {
    await runTradingAction(async () => {
      await tradingService.createPurchase(purchaseData);
    }, 'Paper purchase recorded successfully.');
  };

  const handleUpdateTradingPurchase = async (purchaseData) => {
    await runTradingAction(async () => {
      await tradingService.updatePurchase(purchaseData);
    }, 'Paper purchase updated successfully.');
  };

  const handleDeleteTradingPurchase = async (id) => {
    await runTradingAction(async () => {
      await tradingService.deletePurchase(id);
    }, 'Paper purchase deleted successfully.');
  };

  const handleLoadSellerPayments = async (purchaseId) => {
    return await tradingService.listSellerPayments(purchaseId);
  };

  const handleRecordSellerPayment = async (paymentData) => {
    await runTradingAction(async () => {
      await tradingService.createSellerPayment(paymentData);
    }, 'Seller payment recorded successfully.');
  };

  const handleDeleteSellerPayment = async (id) => {
    await runTradingAction(async () => {
      await tradingService.deleteSellerPayment(id);
    }, 'Seller payment record removed.');
  };

  const handleUpdateSellerPayment = async (paymentData) => {
    await runTradingAction(async () => {
      await tradingService.updateSellerPayment(paymentData);
    }, 'Seller payment updated successfully.');
  };

  const handleSaveTradingSale = async (saleData) => {
    await runTradingAction(async () => {
      await tradingService.createSale(saleData);
    }, 'Paper resale recorded successfully.');
  };

  const handleUpdateTradingSale = async (saleData) => {
    await runTradingAction(async () => {
      await tradingService.updateSale(saleData);
    }, 'Paper resale updated successfully.');
  };

  const handleDeleteTradingSale = async (id) => {
    await runTradingAction(async () => {
      await tradingService.deleteSale(id);
    }, 'Paper resale record deleted.');
  };

  const handleLoadBuyerPayments = async (saleId) => {
    return await tradingService.listBuyerPayments(saleId);
  };

  const handleRecordBuyerPayment = async (receiptData) => {
    await runTradingAction(async () => {
      await tradingService.createBuyerPayment(receiptData);
    }, 'Buyer installment receipt recorded successfully.');
  };

  const handleDeleteBuyerPayment = async (id) => {
    await runTradingAction(async () => {
      await tradingService.deleteBuyerPayment(id);
    }, 'Buyer installment record removed.');
  };

  const handleUpdateBuyerPayment = async (paymentData) => {
    await runTradingAction(async () => {
      await tradingService.updateBuyerPayment(paymentData);
    }, 'Buyer installment updated successfully.');
  };

  const handleExportTradingBackup = async () => {
    return await tradingService.exportBackup();
  };

  const handleSelectTradingRestoreFile = async () => {
    return await tradingService.selectRestoreFile();
  };

  const handleRestoreTradingBackup = async (options) => {
    const res = await tradingService.restoreBackup(options);
    await refreshTradingData();
    return res;
  };

  const handleLoadTradingBackupLogs = async () => {
    return await tradingService.listBackupLogs();
  };

  async function runAction(action, successMessage) {
    setError('');
    setSuccess('');

    try {
      if (window.desktopAPI) {
        await action();
        await refreshData();
      } else {
        await action();
      }
      setSuccess(successMessage);
    } catch (err) {
      setError(err.message || 'The operation failed.');
    }
  }

  async function saveClient(event) {
    event.preventDefault();
    await runAction(async () => {
      if (window.desktopAPI && window.desktopAPI.createClient) {
        const client = await window.desktopAPI.createClient(clientForm);
        setClientForm(emptyClient);
        setProjectForm((old) => ({
          ...old,
          clientId: String(client.id),
        }));
      } else {
        const newClient = {
          id: Date.now(),
          ...clientForm,
          created_at: new Date().toISOString(),
        };
        setClients((prev) => [...prev, newClient]);
        setClientForm(emptyClient);
        setProjectForm((old) => ({
          ...old,
          clientId: String(newClient.id),
        }));
      }
    }, 'Client saved successfully.');
  }

  async function saveProject(event, explicitAuthors, collaboratorDetails) {
    if (event && event.preventDefault) event.preventDefault();
    await runAction(async () => {
      const authorsToSave = explicitAuthors !== undefined ? explicitAuthors : (projectForm.authors || []);
      const selectedClient = clients.find((c) => String(c.id) === String(projectForm.clientId));
      const leadOrcid = collaboratorDetails?.orcid || selectedClient?.orcid || projectForm.leadOrcid || '';

      if (window.desktopAPI && window.desktopAPI.createProject) {
        const project = await window.desktopAPI.createProject({
          ...projectForm,
          authors: authorsToSave,
          clientId: Number(projectForm.clientId),
          commitmentDate: projectForm.commitmentDate || null,
          leadOrcid,
        });

        setProjectForm({
          ...emptyProject,
          clientId: String(project.client_id),
        });

        setObligationForm((old) => ({
          ...old,
          projectId: String(project.id),
        }));
      } else {
        const newProjId = Date.now();
        const newProj = {
          id: newProjId,
          client_id: Number(projectForm.clientId),
          client_name: selectedClient ? selectedClient.name : 'Lead Collaborator',
          client_email: collaboratorDetails?.email || selectedClient?.email || '',
          client_organization: selectedClient?.organization || '',
          lead_orcid: leadOrcid,
          title: projectForm.title,
          work_type: projectForm.workType,
          commitment_date: projectForm.commitmentDate || null,
          target_name: projectForm.targetName || '',
          target_url: projectForm.targetUrl || '',
          description: projectForm.description || '',
          authors: authorsToSave,
          status: 'In Progress',
          created_at: new Date().toISOString(),
        };
        setProjects((prev) => [newProj, ...prev]);
        setProjectForm({
          ...emptyProject,
          clientId: String(projectForm.clientId),
        });
      }
    }, 'Research project saved successfully.');
  }

  async function updateProjectAuthors(projectId, newAuthors) {
    await runAction(async () => {
      if (window.desktopAPI && window.desktopAPI.updateProjectAuthors) {
        await window.desktopAPI.updateProjectAuthors(projectId, newAuthors);
      } else {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, authors: newAuthors } : p))
        );
      }
    }, 'Manuscript authors updated successfully.');
  }

  async function updateProject(projectData) {
    await runAction(async () => {
      const selectedClient = clients.find(
        (c) => String(c.id) === String(projectData.clientId || projectData.client_id)
      );

      if (window.desktopAPI) {
        if (typeof window.desktopAPI.updateProject !== 'function') {
          throw new Error(
            'The database update handler is not loaded in the running Electron process. Please restart your desktop app (Ctrl+C in your terminal running "npm run electron:dev" and start it again) so the new SQLite update handler can take effect.'
          );
        }

        const updated = await window.desktopAPI.updateProject({
          ...projectData,
          clientId: Number(projectData.clientId || projectData.client_id),
          commitmentDate: projectData.commitmentDate || projectData.commitment_date || null,
        });

        setProjects((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );

        if (window.desktopAPI.listProjects) {
          const fresh = await window.desktopAPI.listProjects();
          setProjects(fresh);
        }
      } else {
        // Browser fallback: persist to localStorage
        const stored = JSON.parse(localStorage.getItem('rm_browser_projects') || '[]');
        const baseList = stored.length ? stored : projects;
        const updatedList = baseList.map((p) => {
          if (p.id === projectData.id) {
            return {
              ...p,
              ...projectData,
              client_id: Number(projectData.clientId || projectData.client_id),
              client_name: selectedClient ? selectedClient.name : p.client_name,
              client_email: selectedClient ? selectedClient.email : p.client_email,
              client_organization: selectedClient ? selectedClient.organization : p.client_organization,
              work_type: projectData.workType || projectData.work_type,
              commitment_date: projectData.commitmentDate || projectData.commitment_date || null,
              target_name: projectData.targetName || projectData.target_name || '',
              target_url: projectData.targetUrl || projectData.target_url || '',
              description: projectData.description || '',
              status: projectData.status || p.status,
              lead_orcid: projectData.leadOrcid || projectData.lead_orcid || p.lead_orcid,
            };
          }
          return p;
        });
        localStorage.setItem('rm_browser_projects', JSON.stringify(updatedList));
        setProjects(updatedList);
      }
    }, 'Manuscript details saved successfully.');
  }

  async function updateProjectStatus(projectId, newStatus) {
    await runAction(async () => {
      if (window.desktopAPI) {
        if (typeof window.desktopAPI.updateProjectStatus !== 'function') {
          throw new Error(
            'The database status handler is not loaded in the running Electron process. Please restart your desktop app (re-run "npm run electron:dev").'
          );
        }
        await window.desktopAPI.updateProjectStatus(projectId, newStatus);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
        );
        if (window.desktopAPI.listProjects) {
          const fresh = await window.desktopAPI.listProjects();
          setProjects(fresh);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('rm_browser_projects') || '[]');
        const baseList = stored.length ? stored : projects;
        const updatedList = baseList.map((p) =>
          p.id === projectId ? { ...p, status: newStatus } : p
        );
        localStorage.setItem('rm_browser_projects', JSON.stringify(updatedList));
        setProjects(updatedList);
      }
    }, `Manuscript status updated to ${newStatus}.`);
  }

  async function updateProjectCategory(projectId, newWorkType) {
    await runAction(async () => {
      if (window.desktopAPI) {
        if (typeof window.desktopAPI.updateProjectCategory !== 'function') {
          throw new Error(
            'The database category handler is not loaded in the running Electron process. Please restart your desktop app (re-run "npm run electron:dev").'
          );
        }
        await window.desktopAPI.updateProjectCategory(projectId, newWorkType);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, work_type: newWorkType } : p))
        );
        if (window.desktopAPI.listProjects) {
          const fresh = await window.desktopAPI.listProjects();
          setProjects(fresh);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('rm_browser_projects') || '[]');
        const baseList = stored.length ? stored : projects;
        const updatedList = baseList.map((p) =>
          p.id === projectId ? { ...p, work_type: newWorkType } : p
        );
        localStorage.setItem('rm_browser_projects', JSON.stringify(updatedList));
        setProjects(updatedList);
      }
    }, 'Manuscript category updated successfully.');
  }

  async function deleteProject(projectId) {
    await runAction(async () => {
      if (window.desktopAPI) {
        if (typeof window.desktopAPI.deleteProject !== 'function') {
          throw new Error(
            'The database delete handler is not loaded in the running Electron process. Please restart your desktop app (re-run "npm run electron:dev").'
          );
        }
        await window.desktopAPI.deleteProject(projectId);
        if (window.desktopAPI.listProjects) {
          const fresh = await window.desktopAPI.listProjects();
          setProjects(fresh);
        }
        if (window.desktopAPI.listPayments) {
          const freshPay = await window.desktopAPI.listPayments();
          setPayments(freshPay);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('rm_browser_projects') || '[]');
        const baseList = stored.length ? stored : projects;
        const filtered = baseList.filter((p) => p.id !== projectId);
        localStorage.setItem('rm_browser_projects', JSON.stringify(filtered));
        setProjects(filtered);
        setPayments((prev) => prev.filter((pay) => pay.project_id !== projectId));
      }
    }, 'Research work deleted successfully.');
  }

  async function saveObligation(event) {
    event.preventDefault();
    await runAction(async () => {
      const result = await window.desktopAPI.createPaymentObligation({
        ...obligationForm,
        projectId: Number(obligationForm.projectId),
        dueDate: obligationForm.dueDate || null,
      });

      setObligationForm({
        ...emptyObligation,
        projectId: obligationForm.projectId,
      });

      setReceiptForm((old) => ({
        ...old,
        obligationId: String(result.id),
      }));
    }, 'Payment obligation saved successfully.');
  }

  async function saveReceipt(event) {
    event.preventDefault();
    await runAction(async () => {
      await window.desktopAPI.recordPaymentReceipt({
        ...receiptForm,
        obligationId: Number(receiptForm.obligationId),
      });

      setReceiptForm({
        ...emptyReceipt,
        paymentDate: today(),
      });
    }, 'Payment received recorded successfully.');
  }

  const activePayments = payments.filter(
    (p) => p.status !== 'Cancelled' && p.balance_minor > 0
  );

  const outstandingMinor = activePayments.reduce(
    (sum, p) => sum + p.balance_minor,
    0
  );

  const dueToday = activePayments.filter((p) => p.due_state === 'Due today');
  const overdue = activePayments.filter((p) => p.due_state === 'Overdue');

  const researchCounts = {
    clients: clients.length,
    projects: projects.length,
    payments: activePayments.length,
    overdue: overdue.length,
    history: paymentHistory.length,
  };

  const researchAlertCount = overdue.length + dueToday.length;
  const currentResearchTabMeta = TAB_METADATA[activeTab] || TAB_METADATA.dashboard;

  // Trading navigation metadata and alert calculations
  const currentTradingTabMeta = TRADING_TAB_METADATA[activeTab] || TRADING_TAB_METADATA.trading_dashboard;
  const tradingDueAlerts =
    (tradingBalances.sellerPayables || []).filter((s) => s.remaining_amount_minor > 0).length +
    (tradingBalances.buyerReceivables || []).filter((b) => b.remaining_amount_minor > 0).length;

  const tradingCounts = {
    trading_purchases: tradingPurchases.length,
    trading_sales: tradingSales.length,
    trading_balances: (tradingBalances.sellerPayables || []).length + (tradingBalances.buyerReceivables || []).length,
    trading_due: tradingDueAlerts,
  };

  const activeHeaderTitle = workspace === 'trading' ? currentTradingTabMeta.title : currentResearchTabMeta.title;
  const activeHeaderSubtitle = workspace === 'trading' ? currentTradingTabMeta.subtitle : currentResearchTabMeta.subtitle;
  const activeCounts = workspace === 'trading' ? tradingCounts : researchCounts;
  const activeAlertCount = workspace === 'trading' ? tradingDueAlerts : researchAlertCount;
  const activeRefreshFn = workspace === 'trading' ? refreshTradingData : refreshData;
  const activeLoading = workspace === 'trading' ? tradingLoading : loading;

  const commonProps = {
    clients,
    projects,
    payments,
    paymentHistory,
    activePayments,
    outstandingMinor,
    dueToday,
    overdue,
    clientForm,
    setClientForm,
    saveClient,
    projectForm,
    setProjectForm,
    saveProject,
    updateProjectAuthors,
    updateProject,
    updateProjectStatus,
    updateProjectCategory,
    deleteProject,
    obligationForm,
    setObligationForm,
    saveObligation,
    receiptForm,
    setReceiptForm,
    saveReceipt,
    money,
    dueColor,
    loading,
    fontScale,
    onSelectTab: setActiveTab,
    refreshData,
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mode={mode}
        onToggleMode={toggleMode}
        fontScale={fontScale}
        onIncreaseFontSize={handleIncreaseFontSize}
        onDecreaseFontSize={handleDecreaseFontSize}
        onResetFontSize={handleResetFontSize}
        title={activeHeaderTitle}
        subtitle={activeHeaderSubtitle}
        counts={activeCounts}
        alertCount={activeAlertCount}
        onRefresh={activeRefreshFn}
        loading={activeLoading}
        workspace={workspace}
        onToggleWorkspace={handleToggleWorkspace}
      >
        <Box sx={{ width: '100%', minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', pb: { xs: 2, sm: 2.5 } }}>
          {/* ================================================================ */}
          {/* 1. RESEARCH MANAGEMENT DASHBOARD VIEWS (Standard Workspace)       */}
          {/* ================================================================ */}
          {workspace === 'research' && (
            <>
              {activeTab === 'dashboard' && <DashboardView {...commonProps} />}
              {activeTab === 'clients' && <ClientsView {...commonProps} />}
              {activeTab === 'projects' && <ProjectsView {...commonProps} />}
              {activeTab === 'payments' && <PaymentsView {...commonProps} />}
              {activeTab === 'history' && <HistoryView {...commonProps} />}
              {activeTab === 'backup' && <BackupRestoreView {...commonProps} />}
            </>
          )}

          {/* ================================================================ */}
          {/* 2. RESEARCH PAPER TRADING DASHBOARD VIEWS (Trading Workspace)    */}
          {/* ================================================================ */}
          {workspace === 'trading' && (
            <>
              {activeTab === 'trading_dashboard' && (
                <TradingDashboardView
                  financials={tradingFinancials}
                  purchases={tradingPurchases}
                  sales={tradingSales}
                  sellerPayables={tradingBalances.sellerPayables}
                  buyerReceivables={tradingBalances.buyerReceivables}
                  recentTransactions={tradingTransactions}
                  onSelectTab={setActiveTab}
                  onOpenNewPurchase={() => {
                    setActiveTab('trading_purchases');
                    setOpenTradingPurchaseModal(true);
                  }}
                  onOpenNewSale={() => {
                    setActiveTab('trading_sales');
                    setOpenTradingSaleModal(true);
                  }}
                />
              )}

              {activeTab === 'trading_purchases' && (
                <TradingPurchasesView
                  purchases={tradingPurchases}
                  onSavePurchase={handleSaveTradingPurchase}
                  onUpdatePurchase={handleUpdateTradingPurchase}
                  onDeletePurchase={handleDeleteTradingPurchase}
                  onLoadSellerPayments={handleLoadSellerPayments}
                  onRecordSellerPayment={handleRecordSellerPayment}
                  onDeleteSellerPayment={handleDeleteSellerPayment}
                  loading={tradingLoading}
                  openAddModal={openTradingPurchaseModal}
                  onCloseAddModal={() => setOpenTradingPurchaseModal(false)}
                />
              )}

              {activeTab === 'trading_sales' && (
                <TradingSalesView
                  sales={tradingSales}
                  purchases={tradingPurchases}
                  onSaveSale={handleSaveTradingSale}
                  onUpdateSale={handleUpdateTradingSale}
                  onDeleteSale={handleDeleteTradingSale}
                  onLoadBuyerPayments={handleLoadBuyerPayments}
                  onRecordBuyerPayment={handleRecordBuyerPayment}
                  onDeleteBuyerPayment={handleDeleteBuyerPayment}
                  loading={tradingLoading}
                  openAddModal={openTradingSaleModal}
                  onCloseAddModal={() => setOpenTradingSaleModal(false)}
                />
              )}

              {activeTab === 'trading_balances' && (
                <TradingBalancesView
                  sellerPayables={tradingBalances.sellerPayables}
                  buyerReceivables={tradingBalances.buyerReceivables}
                  onSelectTab={setActiveTab}
                />
              )}

              {activeTab === 'trading_reports' && (
                <TradingReportsView
                  financials={tradingFinancials}
                  recentTransactions={tradingTransactions}
                />
              )}

              {activeTab === 'trading_history' && (
                <TradingHistoryView
                  transactions={tradingTransactions}
                  onUpdatePurchase={handleUpdateTradingPurchase}
                  onDeletePurchase={handleDeleteTradingPurchase}
                  onUpdateSale={handleUpdateTradingSale}
                  onDeleteSale={handleDeleteTradingSale}
                  onUpdateSellerPayment={handleUpdateSellerPayment}
                  onDeleteSellerPayment={handleDeleteSellerPayment}
                  onUpdateBuyerPayment={handleUpdateBuyerPayment}
                  onDeleteBuyerPayment={handleDeleteBuyerPayment}
                  onRefresh={refreshTradingData}
                />
              )}

              {activeTab === 'trading_backup' && (
                <TradingBackupView
                  onExportBackup={handleExportTradingBackup}
                  onSelectRestoreFile={handleSelectTradingRestoreFile}
                  onRestoreBackup={handleRestoreTradingBackup}
                  onLoadBackupLogs={handleLoadTradingBackupLogs}
                  onRefreshAllTradingData={refreshTradingData}
                />
              )}
            </>
          )}
        </Box>
      </MainLayout>

      {/* Floating notification overlays - Displaying/dismissing does not displace surrounding sections */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          mt: { xs: 7, sm: 8.5 },
          zIndex: (theme) => theme.zIndex.snackbar + 100,
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={handleCloseError}
          sx={{
            borderRadius: '7px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            minWidth: { xs: 260, sm: 320 },
            maxWidth: { xs: '90vw', sm: 500 },
            alignItems: 'center',
            fontWeight: 500,
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          mt: { xs: 7, sm: 8.5 },
          zIndex: (theme) => theme.zIndex.snackbar + 100,
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={handleCloseSuccess}
          sx={{
            borderRadius: '7px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            minWidth: { xs: 260, sm: 320 },
            maxWidth: { xs: '90vw', sm: 500 },
            alignItems: 'center',
            fontWeight: 500,
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
