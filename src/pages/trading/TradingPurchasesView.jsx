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
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilterListIcon from '@mui/icons-material/FilterList';

import { formatMoney, formatHumanDate, formatPaymentStatus } from '../../utils/humanize';

const emptyPurchase = {
  title: '',
  sellerName: '',
  sellerContact: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchasePrice: '',
  initialAmountPaid: '',
  paymentMethod: 'Bank Transfer',
  reference: '',
  notes: '',
};

const emptyPayment = {
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Bank Transfer',
  reference: '',
  notes: '',
};

export default function TradingPurchasesView({
  purchases = [],
  onSavePurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onLoadSellerPayments,
  onRecordSellerPayment,
  onDeleteSellerPayment,
  loading = false,
  openAddModal = false,
  onCloseAddModal,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Purchase Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyPurchase);
  const [formError, setFormError] = useState('');

  // Partial Payment & History Modal
  const [activePurchase, setActivePurchase] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState(emptyPayment);
  const [paymentError, setPaymentError] = useState('');

  // Delete Confirmation Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyPurchase);
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

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      title: p.title || '',
      sellerName: p.seller_name || '',
      sellerContact: p.seller_contact || '',
      purchaseDate: p.purchase_date || '',
      purchasePrice: String((p.purchase_price_minor || 0) / 100),
      notes: p.notes || '',
      status: p.status || 'Active',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Research Paper Title is required.');
      return;
    }
    if (!formData.sellerName.trim()) {
      setFormError('Seller Name is required.');
      return;
    }
    if (!formData.purchasePrice || Number(formData.purchasePrice) < 0) {
      setFormError('Please enter a valid purchase price.');
      return;
    }

    try {
      if (editingId) {
        await onUpdatePurchase({
          id: editingId,
          ...formData,
        });
      } else {
        await onSavePurchase(formData);
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save purchase.');
    }
  };

  const handleOpenPayments = async (purchase) => {
    setActivePurchase(purchase);
    setPaymentError('');
    setPaymentFormData({
      ...emptyPayment,
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: purchase.balance_minor > 0 ? String(purchase.balance_minor / 100) : '',
    });
    setIsPaymentModalOpen(true);

    if (onLoadSellerPayments) {
      try {
        const hist = await onLoadSellerPayments(purchase.id);
        setPaymentHistory(hist || []);
      } catch {
        setPaymentError('Could not load payment history.');
      }
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');

    const amt = Number(paymentFormData.amount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      await onRecordSellerPayment({
        purchaseId: activePurchase.id,
        amount: amt,
        paymentDate: paymentFormData.paymentDate,
        paymentMethod: paymentFormData.paymentMethod,
        reference: paymentFormData.reference,
        notes: paymentFormData.notes,
      });

      // Reload history and refresh
      const hist = await onLoadSellerPayments(activePurchase.id);
      setPaymentHistory(hist || []);
      setPaymentFormData({
        ...emptyPayment,
        paymentDate: new Date().toISOString().slice(0, 10),
      });

      // Update local activePurchase remaining balance
      const newPaid = (activePurchase.amount_paid_minor || 0) + amt * 100;
      setActivePurchase((prev) => ({
        ...prev,
        amount_paid_minor: newPaid,
        balance_minor: Math.max(0, (prev.purchase_price_minor || 0) - newPaid),
      }));
    } catch (err) {
      setPaymentError(err.message || 'Failed to record payment.');
    }
  };

  const handleDeleteHistoryPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The purchase balance will update automatically.')) {
      return;
    }
    try {
      await onDeleteSellerPayment(paymentId);
      const hist = await onLoadSellerPayments(activePurchase.id);
      setPaymentHistory(hist || []);
    } catch (err) {
      setPaymentError(err.message || 'Failed to delete payment.');
    }
  };

  const handleDeletePurchaseConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await onDeletePurchase(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      alert(err.message || 'Failed to delete purchase.');
    }
  };

  // Filtered and searched purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (p.payment_status || '').toUpperCase().replace(/\s+/g, '_') === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  // Aggregate stats
  const totalPurchaseSum = useMemo(() => purchases.reduce((s, p) => s + (p.purchase_price_minor || 0), 0), [purchases]);
  const totalPaidSum = useMemo(() => purchases.reduce((s, p) => s + (p.amount_paid_minor || 0), 0), [purchases]);
  const totalBalanceSum = totalPurchaseSum - totalPaidSum;

  return (
    <Stack spacing={3}>
      {/* KPI Header Bar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
              Total Purchases Committed
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {formatMoney(totalPurchaseSum)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
              Total Settled to Sellers
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {formatMoney(totalPaidSum)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
              Outstanding Seller Balance
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {formatMoney(totalBalanceSum)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Action & Filter Controls */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, flex: 1 }}>
              <TextField
                placeholder="Search by paper title, seller, contact, notes..."
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
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PENDING">Pending (Unpaid)</MenuItem>
                <MenuItem value="PARTIALLY_PAID">Partially Paid</MenuItem>
                <MenuItem value="FULLY_PAID">Fully Paid</MenuItem>
              </TextField>
            </Stack>

            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenCreate}
              sx={{ fontWeight: 700, px: 2.5, py: 0.9, whiteSpace: 'nowrap', width: { xs: '100%', md: 'auto' } }}
            >
              Add Paper Purchase
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Purchases Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Paper Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Seller Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Purchase Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Purchase Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 150 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      No research paper purchases found matching your criteria.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click "Add Paper Purchase" above to record a new manuscript acquisition.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((p) => {
                  const statusInfo = formatPaymentStatus(p.payment_status);
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {p.title}
                        </Typography>
                        {p.notes && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 260 }}>
                            {p.notes}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.seller_name}
                        </Typography>
                        {p.seller_contact && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {p.seller_contact}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatHumanDate(p.purchase_date)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatMoney(p.purchase_price_minor)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}>
                        {formatMoney(p.amount_paid_minor)}
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatMoney(p.balance_minor)}
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
                          <Tooltip title="View Payments & Pay Partial Installment">
                            <Button
                              size="small"
                              variant={p.balance_minor > 0 ? 'contained' : 'outlined'}
                              color={p.balance_minor > 0 ? 'primary' : 'inherit'}
                              startIcon={<PaymentIcon sx={{ fontSize: '1rem !important' }} />}
                              onClick={() => handleOpenPayments(p)}
                              sx={{
                                py: 0.3,
                                px: 1,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                minHeight: 'auto',
                              }}
                            >
                              Payments ({p.payments_count || 0})
                            </Button>
                          </Tooltip>

                          <Tooltip title="Edit Purchase Details">
                            <IconButton size="small" onClick={() => handleOpenEdit(p)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Purchase">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(p.id)}>
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

      {/* Add / Edit Purchase Dialog */}
      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? 'Edit Paper Purchase' : 'Record New Paper Purchase'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmitPurchase}>
          <DialogContent dividers>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}

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
                  label="Seller Name *"
                  fullWidth
                  size="small"
                  value={formData.sellerName}
                  onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                  required
                />
                <TextField
                  label="Seller Contact Info (Optional)"
                  fullWidth
                  size="small"
                  placeholder="Email or phone"
                  value={formData.sellerContact}
                  onChange={(e) => setFormData({ ...formData, sellerContact: e.target.value })}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Purchase Date *"
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Total Purchase Price (₹) *"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  required
                />
              </Stack>

              {!editingId && (
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Initial Payment to Seller (Optional)
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Amount Paid Upfront (₹)"
                      type="number"
                      fullWidth
                      size="small"
                      placeholder="0.00"
                      value={formData.initialAmountPaid}
                      onChange={(e) => setFormData({ ...formData, initialAmountPaid: e.target.value })}
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
                    placeholder="e.g. UTR #, Txn ID, Wire Confirmation"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    sx={{ mt: 1.5 }}
                  />
                </Box>
              )}

              <TextField
                label="Notes / Delivery Terms (Optional)"
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
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700 }}>
              {editingId ? 'Save Changes' : 'Record Purchase'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Partial Payments Management & History Dialog */}
      <Dialog open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Seller Payment History & Installments
        </DialogTitle>
        <DialogContent dividers>
          {activePurchase && (
            <Stack spacing={2.5}>
              {/* Paper & Balance Summary */}
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {activePurchase.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Seller: <strong>{activePurchase.seller_name}</strong> {activePurchase.seller_contact && `(${activePurchase.seller_contact})`}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL PURCHASE PRICE
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {formatMoney(activePurchase.purchase_price_minor)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL PAID SO FAR
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {formatMoney(activePurchase.amount_paid_minor)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      OUTSTANDING REMAINING
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: activePurchase.balance_minor > 0 ? 'warning.dark' : 'text.secondary' }}
                    >
                      {formatMoney(activePurchase.balance_minor)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Add New Partial Payment Form */}
              <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}>
                    + Record a New Partial Payment to {activePurchase.seller_name}
                  </Typography>

                  {paymentError && <Alert severity="error" sx={{ mb: 1.5 }}>{paymentError}</Alert>}

                  <Box component="form" onSubmit={handleRecordPayment}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
                      <TextField
                        label="Payment Date *"
                        type="date"
                        size="small"
                        fullWidth
                        value={paymentFormData.paymentDate}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                      <TextField
                        label="Amount (₹) *"
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
                        placeholder="e.g. UTR, Txn Ref, Cheque #"
                        value={paymentFormData.reference}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                      />
                      <TextField
                        label="Payment Notes (Optional)"
                        size="small"
                        fullWidth
                        placeholder="e.g. Second installment"
                        value={paymentFormData.notes}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        sx={{ fontWeight: 700, minWidth: 140 }}
                      >
                        Add Payment
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {/* Installments Table */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                All Recorded Payments ({paymentHistory.length})
              </Typography>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                          No payments have been recorded for this paper yet.
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
                            <Tooltip title="Delete this payment record">
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
            Are you sure you want to delete this research paper purchase?
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Warning: All associated seller payment records will also be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button onClick={handleDeletePurchaseConfirm} variant="contained" color="error" sx={{ fontWeight: 700 }}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
