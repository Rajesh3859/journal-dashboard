import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PaymentIcon from '@mui/icons-material/Payment';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { formatMoney, formatHumanDate, formatPaymentStatus } from '../../utils/humanize';

const emptySale = {
  purchaseId: '',
  title: '',
  buyerName: '',
  buyerContact: '',
  saleDate: new Date().toISOString().slice(0, 10),
  salePrice: '',
  costPrice: '',
  initialAmountReceived: '',
  paymentMethod: 'Bank Transfer',
  reference: '',
  notes: '',
};

const emptyReceipt = {
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Bank Transfer',
  reference: '',
  notes: '',
};

export default function TradingSalesView({
  sales = [],
  purchases = [],
  onSaveSale,
  onUpdateSale,
  onDeleteSale,
  onLoadBuyerPayments,
  onRecordBuyerPayment,
  onDeleteBuyerPayment,
  loading = false,
  openAddModal = false,
  onCloseAddModal,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sale Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptySale);
  const [formError, setFormError] = useState('');

  // Installments Management Modal
  const [activeSale, setActiveSale] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState(emptyReceipt);
  const [paymentError, setPaymentError] = useState('');

  // Delete Confirmation Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptySale);
    setFormError('');
    setIsFormOpen(true);
  };

  // Trigger add modal if opened from dashboard
  React.useEffect(() => {
    if (openAddModal) {
      handleOpenCreate();
      if (onCloseAddModal) onCloseAddModal();
    }
  }, [openAddModal, onCloseAddModal]);

  const handleOpenEdit = (s) => {
    setEditingId(s.id);
    setFormData({
      purchaseId: s.purchase_id ? String(s.purchase_id) : '',
      title: s.title || '',
      buyerName: s.buyer_name || '',
      buyerContact: s.buyer_contact || '',
      saleDate: s.sale_date || '',
      salePrice: String((s.sale_price_minor || 0) / 100),
      costPrice: String((s.cost_price_minor || 0) / 100),
      notes: s.notes || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // When user picks a purchased paper from dropdown, auto-fill title and cost price
  const handleSelectPurchasedPaper = (purchId) => {
    if (!purchId) {
      setFormData((prev) => ({ ...prev, purchaseId: '' }));
      return;
    }
    const match = purchases.find((p) => String(p.id) === String(purchId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        purchaseId: String(match.id),
        title: match.title,
        costPrice: String((match.purchase_price_minor || 0) / 100),
      }));
    }
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Research Paper Title is required.');
      return;
    }
    if (!formData.buyerName.trim()) {
      setFormError('Buyer Name is required.');
      return;
    }
    if (!formData.salePrice || Number(formData.salePrice) < 0) {
      setFormError('Please enter a valid selling price.');
      return;
    }

    try {
      if (editingId) {
        await onUpdateSale({
          id: editingId,
          ...formData,
        });
      } else {
        await onSaveSale(formData);
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save sale.');
    }
  };

  const handleOpenPayments = async (sale) => {
    setActiveSale(sale);
    setPaymentError('');
    setPaymentFormData({
      ...emptyReceipt,
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: sale.balance_minor > 0 ? String(sale.balance_minor / 100) : '',
    });
    setIsPaymentModalOpen(true);

    if (onLoadBuyerPayments) {
      try {
        const hist = await onLoadBuyerPayments(sale.id);
        setPaymentHistory(hist || []);
      } catch {
        setPaymentError('Could not load installment history.');
      }
    }
  };

  const handleRecordInstallment = async (e) => {
    e.preventDefault();
    setPaymentError('');

    const amt = Number(paymentFormData.amount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid installment amount greater than zero.');
      return;
    }

    try {
      await onRecordBuyerPayment({
        saleId: activeSale.id,
        amount: amt,
        paymentDate: paymentFormData.paymentDate,
        paymentMethod: paymentFormData.paymentMethod,
        reference: paymentFormData.reference,
        notes: paymentFormData.notes,
      });

      // Reload history and refresh
      const hist = await onLoadBuyerPayments(activeSale.id);
      setPaymentHistory(hist || []);
      setPaymentFormData({
        ...emptyReceipt,
        paymentDate: new Date().toISOString().slice(0, 10),
      });

      const newReceived = (activeSale.amount_received_minor || 0) + amt * 100;
      setActiveSale((prev) => ({
        ...prev,
        amount_received_minor: newReceived,
        balance_minor: Math.max(0, (prev.sale_price_minor || 0) - newReceived),
      }));
    } catch (err) {
      setPaymentError(err.message || 'Failed to record installment.');
    }
  };

  const handleDeleteHistoryPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this installment receipt? The buyer balance will update automatically.')) {
      return;
    }
    try {
      await onDeleteBuyerPayment(paymentId);
      const hist = await onLoadBuyerPayments(activeSale.id);
      setPaymentHistory(hist || []);
    } catch (err) {
      setPaymentError(err.message || 'Failed to delete installment.');
    }
  };

  const handleDeleteSaleConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await onDeleteSale(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      alert(err.message || 'Failed to delete sale.');
    }
  };

  // Filtered and searched sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.buyer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.buyer_contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (s.payment_status || '').toUpperCase().replace(/\s+/g, '_') === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [sales, searchTerm, statusFilter]);

  // Aggregate stats
  const totalSalesSum = useMemo(() => sales.reduce((acc, s) => acc + (s.sale_price_minor || 0), 0), [sales]);
  const totalReceivedSum = useMemo(() => sales.reduce((acc, s) => acc + (s.amount_received_minor || 0), 0), [sales]);
  const totalBalanceSum = totalSalesSum - totalReceivedSum;
  const totalGrossProfitSum = useMemo(() => sales.reduce((acc, s) => acc + (s.profit_minor || 0), 0), [sales]);

  return (
    <Stack spacing={2.5}>
      {/* KPI Header Bar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Sales Volume
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
              {formatMoney(totalSalesSum)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Cash Collected
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
              {formatMoney(totalReceivedSum)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: totalBalanceSum > 0 ? 'warning.light' : 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Outstanding Receivables
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, mt: 0.5, color: totalBalanceSum > 0 ? 'warning.dark' : 'text.primary' }}
            >
              {formatMoney(totalBalanceSum)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(16, 185, 129, 0.04)' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Cumulative Gross Profit
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
              {formatMoney(totalGrossProfitSum)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Action & Filter Controls */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, flex: 1 }}>
              <TextField
                placeholder="Search by title, buyer name, contact, notes..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 320 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 160 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PENDING">Pending (Unpaid)</MenuItem>
                <MenuItem value="PARTIALLY_PAID">Partially Paid</MenuItem>
                <MenuItem value="FULLY_PAID">Fully Paid</MenuItem>
              </TextField>
            </Stack>

            <Button
              variant="contained"
              color="success"
              startIcon={<PointOfSaleIcon />}
              onClick={handleOpenCreate}
              sx={{ fontWeight: 700, px: 2.2, whiteSpace: 'nowrap', width: { xs: '100%', md: 'auto' } }}
            >
              Record Paper Sale
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Sales Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Resold Paper Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Buyer Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sale Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Profit Spread</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Received</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 150 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      No research paper sales records found matching your criteria.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click "Record Paper Sale" above to register a resale transaction.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((s) => {
                  const statusInfo = formatPaymentStatus(s.payment_status);
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {s.title}
                        </Typography>
                        {s.original_paper_title && s.original_paper_title !== s.title && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Acquired as: {s.original_paper_title}
                          </Typography>
                        )}
                        {s.notes && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 240 }}>
                            {s.notes}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {s.buyer_name}
                        </Typography>
                        {s.buyer_contact && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {s.buyer_contact}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatHumanDate(s.sale_date)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatMoney(s.sale_price_minor)}
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (s.profit_minor || 0) >= 0 ? 'success.main' : 'error.main',
                          }}
                        >
                          +{formatMoney(s.profit_minor || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cost: {formatMoney(s.cost_price_minor || 0)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main', whiteSpace: 'nowrap' }}>
                        {formatMoney(s.amount_received_minor)}
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: s.balance_minor > 0 ? 'warning.dark' : 'text.secondary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatMoney(s.balance_minor)}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={statusInfo.label}
                          color={statusInfo.color}
                          size="small"
                          sx={{ fontWeight: 700, minWidth: 90 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Installments & Record Receipt">
                            <Button
                              size="small"
                              variant={s.balance_minor > 0 ? 'contained' : 'outlined'}
                              color={s.balance_minor > 0 ? 'success' : 'inherit'}
                              startIcon={<PaymentIcon sx={{ fontSize: '1rem !important' }} />}
                              onClick={() => handleOpenPayments(s)}
                              sx={{
                                py: 0.3,
                                px: 1,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                minHeight: 'auto',
                              }}
                            >
                              Receipts ({s.payments_count || 0})
                            </Button>
                          </Tooltip>

                          <Tooltip title="Edit Sale Details">
                            <IconButton size="small" onClick={() => handleOpenEdit(s)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Sale">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(s.id)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add / Edit Sale Dialog */}
      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? 'Edit Paper Sale Record' : 'Record New Paper Sale (Resale)'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmitSale}>
          <DialogContent dividers>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {/* Optional Link to Purchased Paper */}
              {!editingId && purchases.length > 0 && (
                <TextField
                  select
                  label="Link to an Acquired Paper (Auto-fills Title & Cost)"
                  fullWidth
                  size="small"
                  value={formData.purchaseId}
                  onChange={(e) => handleSelectPurchasedPaper(e.target.value)}
                  helperText="Select the purchased paper to link costs for accurate gross profit tracking."
                >
                  <MenuItem value="">— Custom / Independent Paper —</MenuItem>
                  {purchases.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.title} (Bought from {p.seller_name} for {formatMoney(p.purchase_price_minor)})
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label="Research Paper Title *"
                fullWidth
                size="small"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Buyer Name *"
                  fullWidth
                  size="small"
                  value={formData.buyerName}
                  onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                  required
                />
                <TextField
                  label="Buyer Contact Info (Optional)"
                  fullWidth
                  size="small"
                  placeholder="Email, institution, phone"
                  value={formData.buyerContact}
                  onChange={(e) => setFormData({ ...formData, buyerContact: e.target.value })}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Sale Date *"
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Total Selling Price (₹) *"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  required
                />
              </Stack>

              <TextField
                label="Original Purchase / Acquisition Cost (₹)"
                type="number"
                fullWidth
                size="small"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                helperText="Used to compute exact Gross Profit = Selling Price − Purchase Cost."
              />

              {!editingId && (
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Initial Installment Received from Buyer (Optional)
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Amount Received Upfront (₹)"
                      type="number"
                      fullWidth
                      size="small"
                      placeholder="0.00"
                      value={formData.initialAmountReceived}
                      onChange={(e) => setFormData({ ...formData, initialAmountReceived: e.target.value })}
                    />
                    <TextField
                      select
                      label="Payment Method"
                      fullWidth
                      size="small"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <MenuItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</MenuItem>
                      <MenuItem value="UPI">UPI / QR</MenuItem>
                      <MenuItem value="Wire Transfer">Wire Transfer (SWIFT)</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="Cash">Cash</MenuItem>
                    </TextField>
                  </Stack>
                  <TextField
                    label="Transaction Reference / Cheque No."
                    fullWidth
                    size="small"
                    placeholder="e.g. UTR #, Deposit Txn ID"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    sx={{ mt: 1.5 }}
                  />
                </Box>
              )}

              <TextField
                label="Notes / Terms (Optional)"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" sx={{ fontWeight: 700 }}>
              {editingId ? 'Save Changes' : 'Record Sale'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Buyer Installments & Payment Receipts Dialog */}
      <Dialog open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Buyer Installment Schedule & Receipts
        </DialogTitle>
        <DialogContent dividers>
          {activeSale && (
            <Stack spacing={2.5}>
              {/* Paper & Balance Summary */}
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {activeSale.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Buyer: <strong>{activeSale.buyer_name}</strong> {activeSale.buyer_contact && `(${activeSale.buyer_contact})`}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL SELLING PRICE
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {formatMoney(activeSale.sale_price_minor)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL RECEIVED SO FAR
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {formatMoney(activeSale.amount_received_minor)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      OUTSTANDING RECEIVABLE
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: activeSale.balance_minor > 0 ? 'warning.dark' : 'text.secondary' }}
                    >
                      {formatMoney(activeSale.balance_minor)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Add New Installment Receipt Form */}
              <Card sx={{ border: '1px solid', borderColor: 'success.light' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'success.dark' }}>
                    + Record a New Installment Received from {activeSale.buyer_name}
                  </Typography>

                  {paymentError && <Alert severity="error" sx={{ mb: 1.5 }}>{paymentError}</Alert>}

                  <Box component="form" onSubmit={handleRecordInstallment}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
                      <TextField
                        label="Receipt Date *"
                        type="date"
                        size="small"
                        fullWidth
                        value={paymentFormData.paymentDate}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                      <TextField
                        label="Amount Received (₹) *"
                        type="number"
                        size="small"
                        fullWidth
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                        required
                      />
                      <TextField
                        select
                        label="Payment Method"
                        size="small"
                        fullWidth
                        value={paymentFormData.paymentMethod}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                      >
                        <MenuItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</MenuItem>
                        <MenuItem value="UPI">UPI / GPay / PhonePe</MenuItem>
                        <MenuItem value="Wire Transfer">Wire Transfer (SWIFT)</MenuItem>
                        <MenuItem value="Cheque">Cheque</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                      </TextField>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
                      <TextField
                        label="Reference / Transaction ID"
                        size="small"
                        fullWidth
                        placeholder="e.g. UTR, Cheque #, Deposit Ref"
                        value={paymentFormData.reference}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                      />
                      <TextField
                        label="Receipt Notes (Optional)"
                        size="small"
                        fullWidth
                        placeholder="e.g. Milestone 2 installment"
                        value={paymentFormData.notes}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        color="success"
                        sx={{ fontWeight: 700, minWidth: 150 }}
                      >
                        Record Receipt
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {/* Installments Table */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                All Recorded Installment Receipts ({paymentHistory.length})
              </Typography>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Receipt Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Received</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                          No installments recorded for this sale yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentHistory.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{formatHumanDate(item.payment_date)}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{item.payment_method || 'Bank Transfer'}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{item.reference || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{item.notes || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {formatMoney(item.amount_minor)}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Delete this installment record">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteHistoryPayment(item.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setIsPaymentModalOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this research paper sale record?
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Warning: All recorded buyer installment receipts will also be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button onClick={handleDeleteSaleConfirm} variant="contained" color="error" sx={{ fontWeight: 700 }}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
