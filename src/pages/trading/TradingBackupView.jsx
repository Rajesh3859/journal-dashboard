import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Alert,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { formatDateTime } from '../../utils/humanize';

export default function TradingBackupView({
  onExportBackup,
  onSelectRestoreFile,
  onRestoreBackup,
  onLoadBackupLogs,
  onRefreshAllTradingData,
}) {
  const [exportLoading, setExportLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Verification modal before restoring
  const [restoreCandidate, setRestoreCandidate] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Backup logs
  const [backupLogs, setBackupLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    if (onLoadBackupLogs) {
      try {
        const logs = await onLoadBackupLogs();
        setBackupLogs(logs || []);
      } catch {}
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await onExportBackup();
      if (res && res.success) {
        setMessage({
          type: 'success',
          text: `Trading backup created successfully: ${res.fileName} (${(res.size / 1024).toFixed(1)} KB). All paper trading records securely archived.`,
        });
        loadLogs();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to export trading backup.',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSelectFile = async () => {
    setMessage({ type: '', text: '' });
    try {
      if (window.desktopAPI?.trading?.selectRestoreFile) {
        const fileInfo = await window.desktopAPI.trading.selectRestoreFile();
        if (fileInfo) {
          setRestoreCandidate(fileInfo);
          setIsConfirmOpen(true);
        }
      } else {
        // Browser fallback: trigger file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.tpbak,.json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const parsed = JSON.parse(event.target.result);
              if (parsed.app !== 'research-trading' && !parsed.tables?.trading_purchases) {
                setMessage({ type: 'error', text: 'Invalid trading backup file format.' });
                return;
              }
              setRestoreCandidate({
                fileName: file.name,
                rawJsonData: parsed,
                previewSummary: parsed.summary || {
                  purchases: (parsed.tables?.trading_purchases || []).length,
                  seller_payments: (parsed.tables?.trading_seller_payments || []).length,
                  sales: (parsed.tables?.trading_sales || []).length,
                  buyer_payments: (parsed.tables?.trading_buyer_payments || []).length,
                },
              });
              setIsConfirmOpen(true);
            } catch {
              setMessage({ type: 'error', text: 'Could not read or parse JSON backup file.' });
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error selecting backup file.' });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setRestoreLoading(true);
    setIsConfirmOpen(false);

    try {
      const res = await onRestoreBackup({
        filePath: restoreCandidate.filePath,
        rawJsonData: restoreCandidate.rawJsonData,
      });

      if (res && res.success) {
        setMessage({
          type: 'success',
          text: `Trading records restored successfully (${res.counts?.purchases || 0} purchases, ${res.counts?.sales || 0} sales, ${res.counts?.seller_payments || 0} seller payments, ${res.counts?.buyer_payments || 0} buyer receipts). Existing Research Management data remained 100% intact.`,
        });
        if (onRefreshAllTradingData) await onRefreshAllTradingData();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to restore trading backup.',
      });
    } finally {
      setRestoreLoading(false);
      setRestoreCandidate(null);
    }
  };

  return (
    <Stack spacing={3}>
      {message.text && (
        <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Main Operations: Export & Restore Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Export Card */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Export Trading Backup
              </Typography>

              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  INCLUDED IN EXPORT:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • All Paper Purchases & Seller Details
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Partial Payments Disbursed to Sellers
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Resales & Buyer Contract Records
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Installment Receipts Collected from Buyers
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Realized Profit Margins & Balances
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={exportLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                onClick={handleExport}
                disabled={exportLoading}
                sx={{ fontWeight: 700, py: 1.2 }}
              >
                {exportLoading ? 'Exporting Archive...' : 'Export Trading Data Now'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Restore Card */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Restore Trading Backup
              </Typography>

              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  SAFETY CHECKS:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Verifies archive format and signature
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Displays pre-restore records summary for confirmation
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Preserves all Research Management manuscripts & collaborators
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Atomic database transaction prevents partial writes
                </Typography>
              </Box>

              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={restoreLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                onClick={handleSelectFile}
                disabled={restoreLoading}
                sx={{ fontWeight: 700, py: 1.2 }}
              >
                {restoreLoading ? 'Restoring Records...' : 'Select Backup File to Restore'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Backup Logs */}
      {backupLogs.length > 0 && (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Recent Trading Backup Snapshots
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Snapshot File</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.file_name}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{formatDateTime(log.created_at)}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{((log.file_size_bytes || 0) / 1024).toFixed(1)} KB</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                        {log.record_count_summary ? `${log.record_count_summary.purchases || 0} purchases, ${log.record_count_summary.sales || 0} sales` : 'Archived'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Verification Confirmation Modal */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUserIcon color="success" />
          Verify & Confirm Trading Data Restore
        </DialogTitle>
        <DialogContent dividers>
          {restoreCandidate && (
            <Stack spacing={2}>
              <Alert severity="warning">
                Restoring this backup file will overwrite your <strong>current trading records</strong> with the data from this archive.
                Your standard <strong>Research Management System (Collaborators, Manuscripts, APC Fees) is 100% safe</strong> and will remain untouched.
              </Alert>

              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Backup File: {restoreCandidate.fileName}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                  ARCHIVE CONTENTS PREVIEW:
                </Typography>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Purchases</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {restoreCandidate.previewSummary?.purchases || 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Seller Payments</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {restoreCandidate.previewSummary?.seller_payments || 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sales</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {restoreCandidate.previewSummary?.sales || 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Buyer Receipts</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {restoreCandidate.previewSummary?.buyer_payments || 0}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmRestore}
            variant="contained"
            color="success"
            sx={{ fontWeight: 700 }}
          >
            Confirm & Restore Records
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
