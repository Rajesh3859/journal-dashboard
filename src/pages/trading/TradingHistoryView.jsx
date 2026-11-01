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
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import { formatMoney, formatHumanDate, formatPaymentStatus } from '../../utils/humanize';

export default function TradingHistoryView({
  transactions = [],
  onUpdatePurchase,
  onDeletePurchase,
  onUpdateSale,
  onDeleteSale,
  onUpdateSellerPayment,
  onDeleteSellerPayment,
  onUpdateBuyerPayment,
  onDeleteBuyerPayment,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, Purchase, Sale, Seller Payment, Buyer Receipt

  // View Details Modal
  const [selectedTx, setSelectedTx] = useState(null);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    party: '',
    partyContact: '',
    amount: '',
    date: '',
    paymentMethod: '',
    reference: '',
    notes: '',
  });
  const [editError, setEditError] = useState('');

  // Delete Confirmation
  const [deletingTx, setDeletingTx] = useState(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (t.title || '').toLowerCase().includes(term) ||
        (t.party || '').toLowerCase().includes(term) ||
        (t.reference || '').toLowerCase().includes(term) ||
        (t.notes || '').toLowerCase().includes(term) ||
        (t.payment_method || '').toLowerCase().includes(term);

      return matchType && matchSearch;
    });
  }, [transactions, typeFilter, searchTerm]);

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditError('');
    setEditFormData({
      title: tx.title || '',
      party: tx.party || '',
      partyContact: tx.party_contact || '',
      amount: String((tx.amount_minor || 0) / 100),
      date: tx.date || '',
      paymentMethod: tx.payment_method || 'Bank Transfer',
      reference: tx.reference || '',
      notes: tx.notes || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editingTx) return;

    try {
      if (editingTx.type === 'Purchase') {
        await onUpdatePurchase({
          id: editingTx.id,
          title: editFormData.title,
          sellerName: editFormData.party,
          sellerContact: editFormData.partyContact,
          purchaseDate: editFormData.date,
          purchasePrice: editFormData.amount,
          notes: editFormData.notes,
        });
      } else if (editingTx.type === 'Sale') {
        await onUpdateSale({
          id: editingTx.id,
          title: editFormData.title,
          buyerName: editFormData.party,
          buyerContact: editFormData.partyContact,
          saleDate: editFormData.date,
          salePrice: editFormData.amount,
          notes: editFormData.notes,
        });
      } else if (editingTx.type === 'Seller Payment') {
        await onUpdateSellerPayment({
          id: editingTx.id,
          amount: editFormData.amount,
          paymentDate: editFormData.date,
          paymentMethod: editFormData.paymentMethod,
          reference: editFormData.reference,
          notes: editFormData.notes,
        });
      } else if (editingTx.type === 'Buyer Receipt') {
        await onUpdateBuyerPayment({
          id: editingTx.id,
          amount: editFormData.amount,
          paymentDate: editFormData.date,
          paymentMethod: editFormData.paymentMethod,
          reference: editFormData.reference,
          notes: editFormData.notes,
        });
      }

      setEditingTx(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update transaction record.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTx) return;
    try {
      if (deletingTx.type === 'Purchase') {
        await onDeletePurchase(deletingTx.id);
      } else if (deletingTx.type === 'Sale') {
        await onDeleteSale(deletingTx.id);
      } else if (deletingTx.type === 'Seller Payment') {
        await onDeleteSellerPayment(deletingTx.id);
      } else if (deletingTx.type === 'Buyer Receipt') {
        await onDeleteBuyerPayment(deletingTx.id);
      }

      setDeletingTx(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction.');
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Controls Bar */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <TextField
              placeholder="Search history by title, party, reference, notes..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: { xs: '100%', md: 380 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }} flexWrap="wrap">
              <TextField
                select
                size="small"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="ALL">All Transaction Types</MenuItem>
                <MenuItem value="Purchase">Paper Purchases</MenuItem>
                <MenuItem value="Sale">Paper Sales</MenuItem>
                <MenuItem value="Seller Payment">Seller Payments</MenuItem>
                <MenuItem value="Buyer Receipt">Buyer Receipts</MenuItem>
              </TextField>

              <Chip
                label={`${filteredTransactions.length} Records`}
                color="default"
                sx={{ fontWeight: 700, height: 38, px: 1 }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Unified History Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Transaction Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paper Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Party / Counterparty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Method & Reference</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 130 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <ReceiptLongIcon sx={{ fontSize: 36, mb: 1, opacity: 0.6 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      No transaction records found matching your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const typeColor = tx.type === 'Purchase' || tx.type === 'Sale' ? 'primary' : 'default';

                  const isExpense = tx.type === 'Purchase' || tx.type === 'Seller Payment';

                  return (
                    <TableRow key={`${tx.type}-${tx.id}-${idx}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatHumanDate(tx.date)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={tx.type}
                          color={typeColor}
                          size="small"
                          sx={{ fontWeight: 700, minWidth: 100 }}
                        />
                      </TableCell>

                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                          {tx.title}
                        </Typography>
                        {tx.notes && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {tx.notes}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tx.party}
                        </Typography>
                        {tx.party_contact && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {tx.party_contact}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: isExpense ? 'text.primary' : 'primary.main',
                        }}
                      >
                        {isExpense ? '-' : '+'}
                        {formatMoney(tx.amount_minor)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', maxWidth: 180 }}>
                        {tx.payment_method ? (
                          <>
                            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'text.primary' }}>
                              {tx.payment_method}
                            </Typography>
                            {tx.reference && <span>Ref: {tx.reference}</span>}
                          </>
                        ) : (
                          'Agreement Contract'
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={tx.status || 'Completed'}
                          color={tx.status === 'Cancelled' ? 'error' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Transaction Details">
                            <IconButton size="small" onClick={() => setSelectedTx(tx)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit Record">
                            <IconButton size="small" onClick={() => handleOpenEdit(tx)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Record">
                            <IconButton size="small" color="error" onClick={() => setDeletingTx(tx)}>
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

      {/* View Details Modal */}
      <Dialog open={Boolean(selectedTx)} onClose={() => setSelectedTx(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Transaction Details</DialogTitle>
        <DialogContent dividers>
          {selectedTx && (
            <Stack spacing={2}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="caption" color="text.secondary">
                  TRANSACTION TYPE
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {selectedTx.type}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedTx.title}
                </Typography>
              </Box>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Date:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatHumanDate(selectedTx.date)}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Party / Counterparty:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTx.party}</Typography>
              </Stack>

              {selectedTx.party_contact && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Contact Info:</Typography>
                  <Typography variant="body2">{selectedTx.party_contact}</Typography>
                </Stack>
              )}

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Amount:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatMoney(selectedTx.amount_minor)}
                </Typography>
              </Stack>

              {selectedTx.payment_method && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Payment Method:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTx.payment_method}</Typography>
                </Stack>
              )}

              {selectedTx.reference && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Reference / UTR:</Typography>
                  <Typography variant="body2">{selectedTx.reference}</Typography>
                </Stack>
              )}

              {selectedTx.notes && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    NOTES & MEMO
                  </Typography>
                  <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '6px' }}>
                    {selectedTx.notes}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedTx(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Record Modal */}
      <Dialog open={Boolean(editingTx)} onClose={() => setEditingTx(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Edit {editingTx?.type}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogContent dividers>
            <Stack spacing={2}>
              {editError && <Alert severity="error">{editError}</Alert>}

              <TextField
                label="Paper Title *"
                fullWidth
                size="small"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                required
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Party Name *"
                  fullWidth
                  size="small"
                  value={editFormData.party}
                  onChange={(e) => setEditFormData({ ...editFormData, party: e.target.value })}
                  required
                />
                <TextField
                  label="Contact Info"
                  fullWidth
                  size="small"
                  value={editFormData.partyContact}
                  onChange={(e) => setEditFormData({ ...editFormData, partyContact: e.target.value })}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Date *"
                  type="date"
                  fullWidth
                  size="small"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Amount (₹) *"
                  type="number"
                  fullWidth
                  size="small"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  required
                />
              </Stack>

              {(editingTx?.type === 'Seller Payment' || editingTx?.type === 'Buyer Receipt') && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label="Payment Method"
                    fullWidth
                    size="small"
                    value={editFormData.paymentMethod}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  >
                    <MenuItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</MenuItem>
                    <MenuItem value="UPI">UPI / QR</MenuItem>
                    <MenuItem value="Wire Transfer">Wire Transfer (SWIFT)</MenuItem>
                    <MenuItem value="Cheque">Cheque</MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                  </TextField>
                  <TextField
                    label="Reference / Cheque No."
                    fullWidth
                    size="small"
                    value={editFormData.reference}
                    onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
                  />
                </Stack>
              )}

              <TextField
                label="Notes (Optional)"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditingTx(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700 }}>
              Save Changes
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingTx)} onClose={() => setDeletingTx(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this <strong>{deletingTx?.type}</strong> record?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            All linked outstanding balances and dashboard cash flow totals will update automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletingTx(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
