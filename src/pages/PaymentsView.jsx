import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  InputAdornment,
  Chip,
  Alert,
  Link,
  Avatar,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddCardIcon from '@mui/icons-material/AddCard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import {
  getInitials,
  getAvatarColor,
  formatMoney,
  formatHumanDate,
  formatRelativeDue,
  calculateProgress,
} from '../utils/humanize';

export default function PaymentsView({
  payments = [],
  projects = [],
  activePayments = [],
  overdue = [],
  dueToday = [],
  obligationForm,
  setObligationForm,
  saveObligation,
  receiptForm,
  setReceiptForm,
  saveReceipt,
  loading,
  fontScale = 1.0,
  onSelectTab,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saveObligationConfirmOpen, setSaveObligationConfirmOpen] = useState(false);
  const [saveReceiptConfirmOpen, setSaveReceiptConfirmOpen] = useState(false);

  const handleRequestSaveObligation = (e) => {
    e.preventDefault();
    if (!obligationForm.projectId || !obligationForm.description.trim() || !obligationForm.amountDue) return;
    setSaveObligationConfirmOpen(true);
  };

  const handleConfirmSaveObligation = (e) => {
    saveObligation(e);
    setSaveObligationConfirmOpen(false);
  };

  const handleRequestSaveReceipt = (e) => {
    e.preventDefault();
    if (!receiptForm.obligationId || !receiptForm.amount) return;
    setSaveReceiptConfirmOpen(true);
  };

  const handleConfirmSaveReceipt = (e) => {
    saveReceipt(e);
    setSaveReceiptConfirmOpen(false);
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.client_name?.toLowerCase().includes(q) ||
      p.project_title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'overdue' && p.due_state === 'Overdue') ||
      (statusFilter === 'due_today' && p.due_state === 'Due today') ||
      (statusFilter === 'pending' && p.balance_minor > 0) ||
      (statusFilter === 'paid' && p.due_state === 'Paid');
    return matchesSearch && matchesStatus;
  });

  const handleQuickPay = (payment) => {
    setReceiptForm((prev) => ({
      ...prev,
      obligationId: String(payment.id),
      amount: (payment.balance_minor / 100).toFixed(2),
    }));
  };

  const getStatusChip = (dueState) => {
    switch (dueState) {
      case 'Overdue':
        return {
          label: 'Overdue',
          color: 'error',
          icon: <WarningAmberIcon sx={{ fontSize: '13px !important' }} />,
        };
      case 'Due today':
        return {
          label: 'Due Today',
          color: 'warning',
          icon: <ScheduleIcon sx={{ fontSize: '13px !important' }} />,
        };
      case 'Paid':
        return {
          label: 'Settled',
          color: 'success',
          icon: <CheckCircleIcon sx={{ fontSize: '13px !important' }} />,
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          color: 'default',
          icon: <BlockIcon sx={{ fontSize: '13px !important' }} />,
        };
      default:
        return {
          label: 'Pending',
          color: 'info',
          icon: <HourglassEmptyIcon sx={{ fontSize: '13px !important' }} />,
        };
    }
  };

  const columns = [
    {
      field: 'client_name',
      headerName: 'Client & Manuscript',
      flex: 1.2,
      minWidth: 175,
      renderCell: (params) => {
        const clientName = params.value || 'Client';
        const projectTitle = params.row.project_title;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: getAvatarColor(clientName),
                width: 26,
                height: 26,
                fontSize: '0.72rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(clientName)}
            </Avatar>
            <Box sx={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <Tooltip title={clientName} enterDelay={300}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.8125rem' }}>
                  {clientName}
                </Typography>
              </Tooltip>
              {projectTitle && (
                <Tooltip title={projectTitle} enterDelay={300}>
                  <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
                    {projectTitle}
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'description',
      headerName: 'Fee Description',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} enterDelay={300}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', minWidth: 0, width: '100%' }}>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ fontSize: '0.8125rem', minWidth: 0, width: '100%' }}
            >
              {params.value}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 165,
      valueGetter: (_value, row) => {
        return calculateProgress(row.received_minor, row.amount_due_minor);
      },
      renderCell: (params) => {
        const pct = params.value;
        const row = params.row;
        return (
          <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="caption" fontWeight={600} noWrap sx={{ fontSize: '0.72rem' }}>
                {formatMoney(row.received_minor)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', ml: 0.5 }}>
                {pct}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={pct === 100 ? 'success' : pct > 0 ? 'primary' : 'inherit'}
              sx={{ height: 5, borderRadius: '7px' }}
            />
          </Box>
        );
      },
    },
    {
      field: 'balance_minor',
      headerName: 'Remaining Balance',
      width: 140,
      renderCell: (params) => {
        const isSettled = params.value <= 0;
        const isOverdue = params.row.due_state === 'Overdue';
        const formatted = formatMoney(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', minWidth: 0, width: '100%' }}>
            {isSettled ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
                label="Fully Paid"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22 }}
              />
            ) : (
              <Tooltip title={`Unpaid: ${formatted}`} enterDelay={300}>
                <Typography
                  variant="body2"
                  fontWeight={750}
                  color={isOverdue ? 'error.main' : 'text.primary'}
                  noWrap
                  sx={{ fontSize: '0.8125rem', minWidth: 0 }}
                >
                  {formatted}
                </Typography>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: 'due_date',
      headerName: 'Schedule',
      width: 145,
      renderCell: (params) => {
        const relative = formatRelativeDue(params.value, params.row.due_state);
        return (
          <Tooltip title={params.value ? `Target deadline: ${formatHumanDate(params.value)} (${relative.text})` : 'Flexible schedule'} enterDelay={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minWidth: 0, width: '100%' }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8rem', minWidth: 0 }}>
                {relative.text}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem', minWidth: 0 }}>
                {params.value ? `Target: ${formatHumanDate(params.value)}` : 'Flexible schedule'}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'due_state',
      headerName: 'Status',
      width: 125,
      renderCell: (params) => {
        const chip = getStatusChip(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
            <Chip
              size="small"
              icon={chip.icon}
              label={chip.label}
              color={chip.color}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.68rem', height: 23, borderRadius: '6px' }}
            />
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const canPay = params.row.balance_minor > 0 && params.row.status !== 'Cancelled';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
            {canPay ? (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => handleQuickPay(params.row)}
                sx={{
                  fontSize: '0.72rem',
                  height: 28,
                  px: 1,
                  fontWeight: 700,
                  borderRadius: '6px',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Log Receipt
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Settled
              </Typography>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 }, flexGrow: 1, width: '100%' }}>
      {/* Humanized Overdue / Due Today Alerts */}
      {overdue.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: '7px' }}>
          <strong>Attention Needed:</strong> You have {overdue.length} {overdue.length === 1 ? 'overdue payment' : 'overdue payments'} totaling{' '}
          {formatMoney(overdue.reduce((sum, p) => sum + p.balance_minor, 0))}. Please reach out to clients to reconcile.
        </Alert>
      )}

      {dueToday.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: '7px' }}>
          <strong>Action Today:</strong> {dueToday.length} {dueToday.length === 1 ? 'payment is' : 'payments are'} scheduled for collection today.
        </Alert>
      )}

      {/* Forms in 2 Columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
          alignItems: 'stretch',
        }}
      >
        {/* Form: Add Payment Obligation */}
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                <AddCardIcon color="primary" fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={750}>
                  Schedule Agreed Fee / Milestone
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Formalize a fee agreement or project milestone with a client
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />

            <Box component="form" onSubmit={handleRequestSaveObligation} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                <TextField
                  select
                  label="Associated Research Work"
                  required
                  fullWidth
                  size="small"
                  value={obligationForm.projectId}
                  onChange={(e) => setObligationForm({ ...obligationForm, projectId: e.target.value })}
                  disabled={!projects.length}
                  helperText={
                    !projects.length ? (
                      <Typography variant="caption" color="error">
                        No active projects.{' '}
                        <Link
                          component="button"
                          type="button"
                          onClick={() => onSelectTab('projects')}
                          sx={{ verticalAlign: 'baseline', fontWeight: 600 }}
                        >
                          Create a research work first
                        </Link>
                        .
                      </Typography>
                    ) : (
                      'Select the related paper or grant'
                    )
                  }
                >
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)} sx={{ maxWidth: { xs: 320, sm: 550 }, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {p.title} — {p.client_name}{p.authors && p.authors.length > 0 ? ' et al.' : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Milestone / Fee Description"
                  required
                  fullWidth
                  size="small"
                  placeholder="e.g. Drafting milestone, Article processing charges, Final acceptance fee"
                  value={obligationForm.description}
                  onChange={(e) => setObligationForm({ ...obligationForm, description: e.target.value })}
                />

                <TextField
                  label="Agreed Amount (₹)"
                  required
                  fullWidth
                  size="small"
                  placeholder="e.g. 15000.00"
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  value={obligationForm.amountDue}
                  onChange={(e) => setObligationForm({ ...obligationForm, amountDue: e.target.value })}
                  helperText="Total funds committed by the client for this deliverable"
                />

                <TextField
                  label="Target Payment Due Date"
                  type="date"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={obligationForm.dueDate}
                  onChange={(e) => setObligationForm({ ...obligationForm, dueDate: e.target.value })}
                  helperText="Follow-up reminder date"
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !projects.length}
                  startIcon={<AddCardIcon />}
                  sx={{ mt: 'auto', py: 1.2, fontWeight: 700 }}
                >
                  Save Agreed Fee Milestone
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Form: Record Payment Receipt */}
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'success.light', width: 36, height: 36 }}>
                <ReceiptIcon color="success" fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={750}>
                  Log Received Payment
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Record funds received; remaining balance recalculates automatically
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />

            <Box component="form" onSubmit={handleRequestSaveReceipt} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                <TextField
                  select
                  label="Pending Fee / Milestone"
                  required
                  fullWidth
                  size="small"
                  value={receiptForm.obligationId}
                  onChange={(e) => setReceiptForm({ ...receiptForm, obligationId: e.target.value })}
                  disabled={!activePayments.length}
                  helperText={
                    !activePayments.length
                      ? 'No outstanding payments awaiting collection.'
                      : 'Choose which fee this payment applies toward'
                  }
                >
                  {activePayments.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)} sx={{ maxWidth: { xs: 320, sm: 550 }, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {p.client_name} — {p.project_title} (Remaining: {formatMoney(p.balance_minor)})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Amount Collected (₹)"
                  required
                  fullWidth
                  size="small"
                  placeholder="e.g. 5000.00"
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  helperText="Partial payments are fully supported"
                />

                <TextField
                  label="Date Funds Received"
                  type="date"
                  required
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={receiptForm.paymentDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, paymentDate: e.target.value })}
                />

                <TextField
                  label="Transaction Reference / Notes"
                  fullWidth
                  size="small"
                  placeholder="e.g. UPI Ref #8492019, Bank Transfer via HDFC"
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  disabled={loading || !activePayments.length}
                  startIcon={<ReceiptIcon />}
                  sx={{ mt: 'auto', py: 1.2, fontWeight: 700 }}
                >
                  Record Payment Receipt
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* MUI X DataGrid: Payment Follow-up Ledger */}
      <Card variant="outlined" sx={{ borderRadius: '7px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountBalanceWalletIcon color="primary" />
                <Typography variant="h6" fontWeight={750}>
                  Invoicing & Payment Follow-up Ledger
                </Typography>
                <Chip
                  size="small"
                  label={`${payments.length} ${payments.length === 1 ? 'Milestone' : 'Milestones'}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Track fee commitments, scheduled settlements, and received payments across manuscripts.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                placeholder="Search fees & clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: { xs: '100%', sm: 220 },
                  flexShrink: 0,
                  '& .MuiInputBase-root': { height: 36, borderRadius: '6px' },
                }}
              />

              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                sx={{
                  width: { xs: '100%', sm: 160 },
                  flexShrink: 0,
                  '& .MuiInputBase-root': { height: 36, borderRadius: '6px' },
                  '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
                }}
              >
                <MenuItem value="all">All Records</MenuItem>
                <MenuItem value="overdue">Overdue Only</MenuItem>
                <MenuItem value="due_today">Due Today</MenuItem>
                <MenuItem value="pending">Unpaid Balances</MenuItem>
                <MenuItem value="paid">Fully Settled</MenuItem>
              </TextField>
            </Stack>
          </Stack>

          <Box sx={{ flexGrow: 1, height: { xs: 400, sm: 460, md: 520, lg: 580, xl: 640 }, minHeight: '24rem', width: '100%' }}>
            <DataGrid
              rows={filteredPayments}
              columns={columns}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 5, page: 0 } },
              }}
              disableRowSelectionOnClick
              rowHeight={Math.round(52 * (fontScale || 1))}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '7px',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'action.hover',
                  fontWeight: 700,
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
      {/* Save Fee Milestone Confirmation Dialog */}
      <Dialog
        open={saveObligationConfirmOpen}
        onClose={() => setSaveObligationConfirmOpen(false)}
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
          <AddCardIcon color="primary" /> Save Agreed Fee Milestone?
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to record this agreed fee milestone?
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '7px',
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={750}>
              {obligationForm.description}
            </Typography>
            <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mt: 0.3 }}>
              Agreed Amount: ₹{obligationForm.amountDue}
            </Typography>
            {obligationForm.dueDate && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Payment Due: {obligationForm.dueDate}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            This milestone will appear under pending collections and be tracked on the financial ledger.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setSaveObligationConfirmOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSaveObligation}
            color="primary"
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Payment Receipt Confirmation Dialog */}
      <Dialog
        open={saveReceiptConfirmOpen}
        onClose={() => setSaveReceiptConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        disableScrollLock
        slotProps={{
          paper: {
            sx: { borderRadius: '10px' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <ReceiptIcon color="success" /> Log Received Payment?
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to record this received payment?
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '7px',
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={750} color="success.main">
              Payment Amount: ₹{receiptForm.amount}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
              Payment Method: {receiptForm.method || 'Bank Transfer / UPI'}
            </Typography>
            {receiptForm.reference && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Transaction Ref: {receiptForm.reference}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            This will record the payment, update outstanding milestone balances, and credit the client's financial ledger.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setSaveReceiptConfirmOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSaveReceipt}
            color="success"
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
          >
            Confirm & Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
