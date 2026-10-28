import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LaunchIcon from '@mui/icons-material/Launch';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import StorageIcon from '@mui/icons-material/Storage';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return 'Never';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function computeNextWeeklyBackup(lastIso) {
  if (!lastIso) return 'Upon choosing folder';
  try {
    const last = new Date(lastIso);
    const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffDays = Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return 'Scheduled today (on background check)';
    return `${formatDate(next.toISOString())} (in ${diffDays} day${diffDays === 1 ? '' : 's'})`;
  } catch {
    return 'In 7 days';
  }
}

export default function BackupRestoreView({
  clients = [],
  projects = [],
  payments = [],
  paymentHistory = [],
  refreshData,
}) {
  const [backupDir, setBackupDir] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [lastAutoBackup, setLastAutoBackup] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Restore confirmation dialog state
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState(null); // { filePath, fileName, previewSummary, rawData }

  // Status banners
  const [successNotice, setSuccessNotice] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  // Custom folder input dialog state (removes all unsupported window.prompt() calls)
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderInput, setFolderInput] = useState('');

  const isDesktop = Boolean(window.desktopAPI && typeof window.desktopAPI.createBackupNow === 'function');

  // Load current settings and file library
  const loadBackupState = useCallback(async () => {
    setLoading(true);
    try {
      if (isDesktop) {
        const settings = await window.desktopAPI.getBackupSettings();
        if (settings) {
          setBackupDir(settings.backupDirectory || '');
          setAutoEnabled(Boolean(settings.autoBackupEnabled));
          setLastAutoBackup(settings.lastAutoBackup);
          setLastBackup(settings.lastBackup);
          setHistoryLogs(settings.history || []);
        }
        const files = await window.desktopAPI.listBackupFiles();
        setBackupFiles(files || []);
      } else {
        // Web / Browser mode fallback
        const savedDir = localStorage.getItem('rm_browser_backup_dir') || 'Downloads / Custom Folder';
        const savedAuto = localStorage.getItem('rm_browser_backup_auto') !== 'false';
        const savedLast = localStorage.getItem('rm_browser_backup_last');
        const savedAutoLast = localStorage.getItem('rm_browser_backup_auto_last');
        const savedLogs = JSON.parse(localStorage.getItem('rm_browser_backup_logs') || '[]');

        setBackupDir(savedDir);
        setAutoEnabled(savedAuto);
        setLastBackup(savedLast);
        setLastAutoBackup(savedAutoLast);
        setHistoryLogs(savedLogs);
      }
    } catch (err) {
      console.error('Failed to load backup settings:', err);
    } finally {
      setLoading(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    loadBackupState();

    if (isDesktop && window.desktopAPI.onAutoBackupCompleted) {
      const unsubscribe = window.desktopAPI.onAutoBackupCompleted((autoResult) => {
        setSuccessNotice({
          title: 'Automated Weekly Backup Completed',
          details: `Weekly snapshot saved to ${autoResult.fileName} without interrupting your session.`,
        });
        loadBackupState();
      });
      return () => unsubscribe && unsubscribe();
    }
  }, [loadBackupState, isDesktop]);

  // Handle folder selection without ever calling unsupported window.prompt()
  const handleSelectFolder = async () => {
    setErrorNotice(null);
    try {
      if (window.desktopAPI && typeof window.desktopAPI.selectBackupDirectory === 'function') {
        const selected = await window.desktopAPI.selectBackupDirectory();
        if (selected) {
          setBackupDir(selected);
          setAutoEnabled(true);
          setSuccessNotice({
            title: 'Custom Backup Destination Configured',
            details: `Weekly automated backups will now be stored in "${selected}".`,
          });
          await loadBackupState();
        }
      } else {
        // Fallback for pending desktop restart or browser mode: In-app Material UI modal
        setFolderInput(backupDir || 'C:\\Research_Backups');
        setFolderModalOpen(true);
      }
    } catch (err) {
      setErrorNotice(err.message || 'Could not select destination folder.');
    }
  };

  const handleSaveCustomFolderInput = async () => {
    const trimmed = folderInput.trim();
    if (!trimmed) {
      setErrorNotice('Please specify a valid folder path.');
      return;
    }
    setBackupDir(trimmed);
    setAutoEnabled(true);
    if (window.desktopAPI && typeof window.desktopAPI.saveBackupSettings === 'function') {
      try {
        await window.desktopAPI.saveBackupSettings({
          backupDirectory: trimmed,
          autoBackupEnabled: true,
        });
      } catch (e) {
        console.warn('Could not save to desktopAPI settings:', e);
      }
    } else {
      localStorage.setItem('rm_browser_backup_dir', trimmed);
    }
    setFolderModalOpen(false);
    setSuccessNotice({
      title: 'Custom Backup Destination Saved',
      details: `Weekly automated backups will now reference "${trimmed}".`,
    });
    await loadBackupState();
  };

  // Toggle weekly auto backup
  const handleToggleAutoBackup = async (event) => {
    const nextVal = event.target.checked;
    setAutoEnabled(nextVal);
    try {
      if (isDesktop) {
        await window.desktopAPI.saveBackupSettings({
          backupDirectory: backupDir,
          autoBackupEnabled: nextVal,
        });
      } else {
        localStorage.setItem('rm_browser_backup_auto', String(nextVal));
      }
    } catch (err) {
      console.error('Failed to toggle auto backup:', err);
    }
  };

  // Create immediate backup
  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      if (isDesktop) {
        const res = await window.desktopAPI.createBackupNow({
          targetFolder: backupDir,
        });
        setSuccessNotice({
          title: 'Backup Created Successfully',
          details: `Workspace snapshot saved to "${res.fileName}" (${formatBytes(res.size)}).`,
          summary: res.summary,
        });
        await loadBackupState();
      } else {
        // Browser download fallback
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `Research_Backup_Manual_${timestamp}.rmbak`;
        const payload = {
          app: 'research-management',
          format_version: 1,
          backup_type: 'manual',
          timestamp: now.toISOString(),
          summary: {
            clients: clients.length,
            projects: projects.length,
            obligations: payments.length,
            transactions: paymentHistory.length,
            total_records: clients.length + projects.length + payments.length + paymentHistory.length,
          },
          tables: {
            clients,
            projects,
            payment_obligations: payments,
            payment_transactions: paymentHistory,
          },
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        localStorage.setItem('rm_browser_backup_last', now.toISOString());
        setLastBackup(now.toISOString());

        setSuccessNotice({
          title: 'Backup File Downloaded',
          details: `Backup archive "${fileName}" has been downloaded to your computer.`,
          summary: payload.summary,
        });
      }
    } catch (err) {
      setErrorNotice(err.message || 'Failed to create backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Export standalone backup file to any path
  const handleExportStandalone = async () => {
    if (!isDesktop) {
      handleBackupNow();
      return;
    }
    setErrorNotice(null);
    try {
      const res = await window.desktopAPI.exportStandaloneBackup();
      if (res && res.success) {
        setSuccessNotice({
          title: 'Standalone Backup Exported',
          details: `Successfully exported to "${res.filePath}".`,
          summary: res.summary,
        });
        await loadBackupState();
      }
    } catch (err) {
      setErrorNotice(err.message || 'Export cancelled or failed.');
    }
  };

  // Open file selector to prepare restore
  const handlePickRestoreFile = async () => {
    setErrorNotice(null);
    try {
      if (isDesktop) {
        const fileInfo = await window.desktopAPI.selectRestoreFile();
        if (fileInfo) {
          setRestoreCandidate(fileInfo);
          setRestoreModalOpen(true);
        }
      } else {
        // Browser file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.rmbak,.json';
        input.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const previewSummary = parsed.summary || {
              clients: (parsed.tables?.clients || []).length,
              projects: (parsed.tables?.projects || []).length,
              obligations: (parsed.tables?.payment_obligations || []).length,
              transactions: (parsed.tables?.payment_transactions || []).length,
            };
            setRestoreCandidate({
              fileName: file.name,
              previewSummary,
              rawData: parsed,
            });
            setRestoreModalOpen(true);
          } catch {
            setErrorNotice('The selected file is not a valid JSON or .rmbak backup archive.');
          }
        };
        input.click();
      }
    } catch (err) {
      setErrorNotice(err.message || 'Failed to select restore file.');
    }
  };

  // Prepare restore from library list
  const handleSelectFromLibrary = (fileItem) => {
    setRestoreCandidate({
      filePath: fileItem.filePath,
      fileName: fileItem.fileName,
      previewSummary: fileItem.summary,
    });
    setRestoreModalOpen(true);
  };

  // Execute restore confirmation
  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setIsRestoring(true);
    setErrorNotice(null);

    try {
      if (isDesktop) {
        const res = await window.desktopAPI.restoreBackup({
          filePath: restoreCandidate.filePath,
        });
        setSuccessNotice({
          title: 'Workspace Restored Successfully',
          details: `All records have been restored from "${restoreCandidate.fileName}" directly into your database.`,
          summary: res.counts,
        });
      } else {
        // Browser restore fallback
        if (restoreCandidate.rawData?.tables) {
          const t = restoreCandidate.rawData.tables;
          localStorage.setItem('rm_browser_clients', JSON.stringify(t.clients || []));
          localStorage.setItem('rm_browser_projects', JSON.stringify(t.projects || []));
          localStorage.setItem('rm_browser_payments', JSON.stringify(t.payment_obligations || []));
          localStorage.setItem('rm_browser_history', JSON.stringify(t.payment_transactions || []));

          setSuccessNotice({
            title: 'Workspace Restored Successfully',
            details: `All records have been restored from "${restoreCandidate.fileName}".`,
            summary: restoreCandidate.previewSummary,
          });
        }
      }

      setRestoreModalOpen(false);
      setRestoreCandidate(null);

      // Reload global application datasets so all views show fresh restored data immediately!
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      setErrorNotice(err.message || 'Failed to restore workspace.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenFolder = async () => {
    if (isDesktop && backupDir) {
      await window.desktopAPI.openBackupFolder(backupDir);
    }
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, p: { xs: 1.5, sm: 2.5 } }}>
      {/* Top Banner / Breadcrumb & Status */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <SettingsBackupRestoreIcon color="primary" sx={{ fontSize: 26 }} />
            <Typography variant="h6" fontWeight={750}>
              Backup & Restore Center
            </Typography>
            <Chip
              size="small"
              icon={<CloudDoneIcon sx={{ fontSize: '14px !important' }} />}
              label={autoEnabled && backupDir ? 'Weekly Auto-Backup Active' : 'Manual Mode'}
              color={autoEnabled && backupDir ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Automated weekly workspace snapshots, custom storage locations, and verified data recovery.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadBackupState}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, borderRadius: '7px' }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={isBackingUp ? <CircularProgress size={16} color="inherit" /> : <SaveAltIcon />}
            onClick={handleBackupNow}
            disabled={isBackingUp}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2, borderRadius: '7px' }}
          >
            {isBackingUp ? 'Creating Backup…' : 'Backup Now'}
          </Button>
        </Stack>
      </Stack>

      {/* Notifications */}
      {successNotice && (
        <Alert
          severity="success"
          onClose={() => setSuccessNotice(null)}
          sx={{ mb: 2.5, borderRadius: '7px', alignItems: 'center' }}
        >
          <Typography variant="subtitle2" fontWeight={750}>
            {successNotice.title}
          </Typography>
          <Typography variant="body2">{successNotice.details}</Typography>
          {successNotice.summary && (
            <Stack direction="row" spacing={1} sx={{ mt: 0.8 }} flexWrap="wrap">
              <Chip size="small" label={`${successNotice.summary.projects ?? 0} Manuscripts`} color="success" variant="outlined" />
              <Chip size="small" label={`${successNotice.summary.clients ?? 0} Collaborators`} color="success" variant="outlined" />
              <Chip size="small" label={`${successNotice.summary.obligations ?? 0} Fee Milestones`} color="success" variant="outlined" />
              <Chip size="small" label={`${successNotice.summary.transactions ?? 0} Receipts`} color="success" variant="outlined" />
            </Stack>
          )}
        </Alert>
      )}

      {errorNotice && (
        <Alert
          severity="error"
          onClose={() => setErrorNotice(null)}
          sx={{ mb: 2.5, borderRadius: '7px', alignItems: 'center' }}
        >
          <Typography variant="subtitle2" fontWeight={750}>
            Backup Notice
          </Typography>
          <Typography variant="body2">{errorNotice}</Typography>
        </Alert>
      )}

      {/* Main Grid: Auto-Backup Config & Quick Action Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
          gap: 2.5,
          mb: 3,
        }}
      >
        {/* Card 1: Weekly Automated Backup Configuration */}
        <Card variant="outlined" sx={{ borderRadius: '7px' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ScheduleIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={750}>
                  Automated Weekly Protection
                </Typography>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoEnabled}
                    onChange={handleToggleAutoBackup}
                    color="primary"
                    disabled={!backupDir}
                  />
                }
                label={
                  <Typography variant="caption" fontWeight={700}>
                    {autoEnabled ? 'ENABLED' : 'DISABLED'}
                  </Typography>
                }
              />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hands-off workspace safety. Once your custom backup folder is chosen, the system automatically creates a clean, verified snapshot every 7 days without needing your permission or interrupting your work.
            </Typography>

            {/* Custom Location Path Box */}
            <Box
              sx={{
                p: 1.8,
                borderRadius: '7px',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                mb: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                Custom Backup Storage Location
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={1.5}
              >
                <Typography
                  variant="body2"
                  fontWeight={650}
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.86rem',
                    wordBreak: 'break-all',
                    color: backupDir ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {backupDir ? backupDir : 'No custom folder selected yet — please choose one below.'}
                </Typography>

                <Stack direction="row" spacing={1} flexShrink={0}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
                    onClick={handleSelectFolder}
                    sx={{ textTransform: 'none', fontWeight: 650, height: 32, borderRadius: '6px' }}
                  >
                    {backupDir ? 'Change Folder' : 'Choose Location'}
                  </Button>
                  {isDesktop && backupDir && (
                    <Tooltip title="Open folder in File Explorer">
                      <IconButton
                        size="small"
                        onClick={handleOpenFolder}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '6px',
                          width: 32,
                          height: 32,
                        }}
                      >
                        <LaunchIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Box>

            {/* Timers & Status details */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last Automatic Backup
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.2 }}>
                  {formatDate(lastAutoBackup)}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Next Scheduled Backup
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.2, color: 'primary.main' }}>
                  {backupDir && autoEnabled ? computeNextWeeklyBackup(lastAutoBackup) : 'Awaiting folder configuration'}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Database Persistence
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.2, color: 'success.main' }}>
                  Persisted across restarts
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Card 2: Manual Backup & Standalone Export */}
        <Card variant="outlined" sx={{ borderRadius: '7px' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <SaveAltIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={750}>
                  Manual Snapshots & Exports
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Instantly capture a point-in-time copy of your manuscripts, author logins, and payment records without affecting your automated schedule.
              </Typography>

              <Box sx={{ p: 1.5, borderRadius: '7px', bgcolor: 'action.hover', mb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active Workspace Summary
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.8 }} flexWrap="wrap">
                  <Chip size="small" label={`${projects.length} Manuscripts`} variant="outlined" />
                  <Chip size="small" label={`${clients.length} Collaborators`} variant="outlined" />
                  <Chip size="small" label={`${payments.length} Milestones`} variant="outlined" />
                  <Chip size="small" label={`${paymentHistory.length} Receipts`} variant="outlined" />
                </Stack>
              </Box>
            </Box>

            <Stack direction="column" spacing={1.2}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={isBackingUp ? <CircularProgress size={16} color="inherit" /> : <SaveAltIcon />}
                onClick={handleBackupNow}
                disabled={isBackingUp}
                sx={{ textTransform: 'none', fontWeight: 700, height: 38, borderRadius: '7px' }}
              >
                {isBackingUp ? 'Creating Backup…' : 'Create Snapshot in Backup Folder'}
              </Button>

              {isDesktop && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<FolderOpenIcon />}
                  onClick={handleExportStandalone}
                  sx={{ textTransform: 'none', fontWeight: 650, height: 38, borderRadius: '7px' }}
                >
                  Export Standalone File (USB / External Drive)…
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Card 3: Restore Workspace Section */}
      <Card variant="outlined" sx={{ borderRadius: '7px', mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <UploadFileIcon color="warning" />
                <Typography variant="subtitle1" fontWeight={750}>
                  Restore Workspace from Backup
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Select any verified snapshot (.rmbak, .json, or .sqlite) to restore manuscripts, client records, and financial ledger data back to the database.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<UploadFileIcon />}
              onClick={handlePickRestoreFile}
              disabled={isRestoring}
              sx={{ textTransform: 'none', fontWeight: 700, height: 38, px: 2.5, borderRadius: '7px', flexShrink: 0 }}
            >
              Select Backup File to Restore…
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Card 4: Discovered Backups in Custom Folder & History Log */}
      <Card variant="outlined" sx={{ borderRadius: '7px' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={750}>
                Available Backups in Custom Destination
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {backupFiles.length > 0
                  ? `${backupFiles.length} backup file${backupFiles.length === 1 ? '' : 's'} stored in "${backupDir}/ResearchManagement_Backups"`
                  : backupDir
                  ? 'No backups created in this location yet. Click "Backup Now" to create your first snapshot.'
                  : 'Please configure a custom backup folder above to view available archives.'}
              </Typography>
            </Box>
            {backupDir && isDesktop && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
                onClick={handleOpenFolder}
                sx={{ textTransform: 'none', fontWeight: 650, height: 32, borderRadius: '6px' }}
              >
                Open in Explorer
              </Button>
            )}
          </Box>

          <Divider />

          {backupFiles.length > 0 ? (
            <TableContainer component={Box} sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Created Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Contents Summary</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupFiles.map((f) => {
                    const isWeekly = f.isAuto || f.fileName.includes('Auto');
                    return (
                      <TableRow key={f.filePath || f.fileName} hover>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isWeekly ? 'Weekly Auto' : 'Manual'}
                            color={isWeekly ? 'secondary' : 'primary'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 650, fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {f.fileName}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                          {formatDate(f.modifiedAt)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {formatBytes(f.sizeBytes)}
                        </TableCell>
                        <TableCell>
                          {f.summary ? (
                            <Typography variant="caption" color="text.secondary">
                              {f.summary.projects ?? 0} Works &bull; {f.summary.clients ?? 0} Authors &bull; {f.summary.obligations ?? 0} Invoices
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Full SQLite snapshot
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleSelectFromLibrary(f)}
                            sx={{ textTransform: 'none', fontWeight: 650, fontSize: '0.75rem', height: 28, borderRadius: '6px' }}
                          >
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" fontWeight={650}>
                No backup archives found in this folder
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 400, display: 'block', mx: 'auto', mt: 0.5 }}>
                Click "Create Snapshot in Backup Folder" above to generate your first backup. Once created, weekly snapshots will appear here automatically.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={restoreModalOpen}
        onClose={() => !isRestoring && setRestoreModalOpen(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        slotProps={{
          paper: {
            sx: { borderRadius: '10px' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <WarningAmberIcon color="warning" /> Restore Workspace Data?
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to restore your workspace records from this backup?
          </Typography>

          <Box
            sx={{
              p: 1.8,
              borderRadius: '7px',
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={750} sx={{ fontFamily: 'monospace', mb: 0.8 }}>
              {restoreCandidate?.fileName}
            </Typography>

            {restoreCandidate?.previewSummary && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`${restoreCandidate.previewSummary.projects ?? 0} Manuscripts`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${restoreCandidate.previewSummary.clients ?? 0} Collaborators`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${restoreCandidate.previewSummary.obligations ?? 0} Fee Milestones`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${restoreCandidate.previewSummary.transactions ?? 0} Receipts`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
            )}
          </Box>

          <Alert severity="warning" sx={{ borderRadius: '7px' }}>
            Restoring will update your active database records to match this snapshot. Any entries created after this backup date will be overwritten.
          </Alert>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setRestoreModalOpen(false)}
            disabled={isRestoring}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRestore}
            color="warning"
            variant="contained"
            disabled={isRestoring}
            startIcon={isRestoring ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
          >
            {isRestoring ? 'Restoring Workspace…' : 'Confirm & Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Folder Path Dialog (Replaces prompt()) */}
      <Dialog
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        maxWidth="xs"
        fullWidth
        disableScrollLock
        slotProps={{
          paper: {
            sx: { borderRadius: '10px' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
          <FolderOpenIcon color="primary" /> Set Custom Backup Folder
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Enter or paste the path where you would like your weekly backups and snapshots stored:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Folder Destination Path"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="e.g. D:\Research_Backups or C:\Users\YourName\Backups"
            helperText="The system will create a 'ResearchManagement_Backups' directory here."
            sx={{ mb: 1 }}
          />
          {window.desktopAPI && typeof window.desktopAPI.selectBackupDirectory !== 'function' && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '7px', fontSize: '0.78rem' }}>
              Tip: To use the native Windows File Explorer browse window, restart your desktop app (press Ctrl+C in your terminal running <code>npm run electron:dev</code> and start it again).
            </Alert>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setFolderModalOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveCustomFolderInput}
            color="primary"
            variant="contained"
            disabled={!folderInput.trim()}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
          >
            Save Location
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
