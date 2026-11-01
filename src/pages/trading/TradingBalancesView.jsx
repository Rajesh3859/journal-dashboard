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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { formatMoney, formatHumanDate, formatPaymentStatus } from '../../utils/humanize';

export default function TradingBalancesView({
  sellerPayables = [],
  buyerReceivables = [],
  onSelectTab,
  onOpenPurchases,
  onOpenSales,
}) {
  const [activeTab, setActiveTab] = useState(0); // 0: Seller Payables, 1: Buyer Receivables
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('DUE_ONLY'); // DUE_ONLY, ALL, PARTIAL, SETTLED
  const [sortBy, setSortBy] = useState('REMAINING_DESC'); // REMAINING_DESC, NAME_ASC, LAST_DATE_DESC

  // Aggregate stats for Seller Payables
  const sellerStats = useMemo(() => {
    const totalPurchased = sellerPayables.reduce((acc, s) => acc + (s.total_purchase_amount_minor || 0), 0);
    const totalPaid = sellerPayables.reduce((acc, s) => acc + (s.total_amount_paid_minor || 0), 0);
    const totalRemaining = totalPurchased - totalPaid;
    const pendingCount = sellerPayables.filter((s) => s.remaining_amount_minor > 0).length;
    return { totalPurchased, totalPaid, totalRemaining, pendingCount };
  }, [sellerPayables]);

  // Aggregate stats for Buyer Receivables
  const buyerStats = useMemo(() => {
    const totalSold = buyerReceivables.reduce((acc, b) => acc + (b.total_sales_amount_minor || 0), 0);
    const totalReceived = buyerReceivables.reduce((acc, b) => acc + (b.total_amount_received_minor || 0), 0);
    const totalRemaining = totalSold - totalReceived;
    const pendingCount = buyerReceivables.filter((b) => b.remaining_amount_minor > 0).length;
    return { totalSold, totalReceived, totalRemaining, pendingCount };
  }, [buyerReceivables]);

  // Filter & sort seller payables
  const filteredSellers = useMemo(() => {
    return sellerPayables
      .filter((s) => {
        const matchSearch =
          (s.seller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.papers_list || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchStatus = true;
        if (statusFilter === 'DUE_ONLY') {
          matchStatus = s.remaining_amount_minor > 0;
        } else if (statusFilter === 'PARTIAL') {
          matchStatus = s.remaining_amount_minor > 0 && s.total_amount_paid_minor > 0;
        } else if (statusFilter === 'SETTLED') {
          matchStatus = s.remaining_amount_minor <= 0;
        }

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'REMAINING_DESC') {
          return (b.remaining_amount_minor || 0) - (a.remaining_amount_minor || 0);
        }
        if (sortBy === 'NAME_ASC') {
          return (a.seller_name || '').localeCompare(b.seller_name || '');
        }
        if (sortBy === 'LAST_DATE_DESC') {
          return (b.last_payment_date || '').localeCompare(a.last_payment_date || '');
        }
        return 0;
      });
  }, [sellerPayables, searchTerm, statusFilter, sortBy]);

  // Filter & sort buyer receivables
  const filteredBuyers = useMemo(() => {
    return buyerReceivables
      .filter((b) => {
        const matchSearch =
          (b.buyer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (b.papers_list || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchStatus = true;
        if (statusFilter === 'DUE_ONLY') {
          matchStatus = b.remaining_amount_minor > 0;
        } else if (statusFilter === 'PARTIAL') {
          matchStatus = b.remaining_amount_minor > 0 && b.total_amount_received_minor > 0;
        } else if (statusFilter === 'SETTLED') {
          matchStatus = b.remaining_amount_minor <= 0;
        }

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'REMAINING_DESC') {
          return (b.remaining_amount_minor || 0) - (a.remaining_amount_minor || 0);
        }
        if (sortBy === 'NAME_ASC') {
          return (a.buyer_name || '').localeCompare(b.buyer_name || '');
        }
        if (sortBy === 'LAST_DATE_DESC') {
          return (b.last_payment_date || '').localeCompare(a.last_payment_date || '');
        }
        return 0;
      });
  }, [buyerReceivables, searchTerm, statusFilter, sortBy]);

  return (
    <Stack spacing={2.5}>
      {/* Top Tabs Switcher */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              py: 2,
              fontWeight: 700,
              fontSize: '0.96rem',
            },
          }}
        >
          <Tab
            icon={<MoneyOffIcon />}
            iconPosition="start"
            label={`Seller Payables (${sellerStats.pendingCount} Owed)`}
          />
          <Tab
            icon={<AccountBalanceWalletIcon />}
            iconPosition="start"
            label={`Buyer Receivables (${buyerStats.pendingCount} Pending)`}
          />
        </Tabs>
      </Card>

      {/* KPI Stats Bar corresponding to active tab */}
      {activeTab === 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL PURCHASE VOLUME
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                {formatMoney(sellerStats.totalPurchased)}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL PAID TO SELLERS
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                {formatMoney(sellerStats.totalPaid)}
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              border: '1px solid',
              borderColor: sellerStats.totalRemaining > 0 ? 'warning.main' : 'divider',
              bgcolor: sellerStats.totalRemaining > 0 ? 'rgba(245, 158, 11, 0.05)' : 'inherit',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL PAYABLES OWED
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mt: 0.5,
                  color: sellerStats.totalRemaining > 0 ? 'warning.dark' : 'text.primary',
                }}
              >
                {formatMoney(sellerStats.totalRemaining)}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                SELLERS AWAITING DUES
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                {sellerStats.pendingCount} of {sellerPayables.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL SALES VOLUME
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                {formatMoney(buyerStats.totalSold)}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL CASH COLLECTED
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                {formatMoney(buyerStats.totalReceived)}
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              border: '1px solid',
              borderColor: buyerStats.totalRemaining > 0 ? 'error.main' : 'divider',
              bgcolor: buyerStats.totalRemaining > 0 ? 'rgba(239, 68, 68, 0.05)' : 'inherit',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL OUTSTANDING RECEIVABLES
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mt: 0.5,
                  color: buyerStats.totalRemaining > 0 ? 'error.main' : 'text.primary',
                }}
              >
                {formatMoney(buyerStats.totalRemaining)}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                BUYERS WITH PENDING DUES
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                {buyerStats.pendingCount} of {buyerReceivables.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filter and Search Bar */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <TextField
              placeholder={activeTab === 0 ? "Search by seller name or paper title..." : "Search by buyer name or paper title..."}
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: { xs: '100%', md: 360 } }}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 170 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="DUE_ONLY">With Outstanding Dues</MenuItem>
                <MenuItem value="ALL">All Accounts</MenuItem>
                <MenuItem value="PARTIAL">Partially Settled</MenuItem>
                <MenuItem value="SETTLED">Fully Settled</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ minWidth: 180 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SortIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="REMAINING_DESC">Highest Due First</MenuItem>
                <MenuItem value="NAME_ASC">Name (A to Z)</MenuItem>
                <MenuItem value="LAST_DATE_DESC">Recent Payment Date</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Tables based on active tab */}
      {activeTab === 0 ? (
        /* Seller Payables Table */
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 850 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Seller Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Papers Purchased</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Purchase Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Paid</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining to Pay</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Payment Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 36, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        No pending seller payables match your filter.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        All researchers have been settled or no accounts fit current search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSellers.map((s, idx) => {
                    const st = formatPaymentStatus(s.payment_status);
                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{s.seller_name}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {s.papers_count} {s.papers_count === 1 ? 'Paper' : 'Papers'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {s.papers_list}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {formatMoney(s.total_purchase_amount_minor)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main', whiteSpace: 'nowrap' }}>
                          {formatMoney(s.total_amount_paid_minor)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 800,
                            color: s.remaining_amount_minor > 0 ? 'warning.dark' : 'text.secondary',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatMoney(s.remaining_amount_minor)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatHumanDate(s.last_payment_date)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700, minWidth: 90 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => onSelectTab && onSelectTab('trading_purchases')}
                            sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.3 }}
                          >
                            Manage Dues
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        /* Buyer Receivables Table */
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 850 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Buyer Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Papers Purchased from Us</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Sales Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Received</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining to Receive</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Payment Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBuyers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 36, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        No pending buyer receivables match your filter.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        All client accounts have settled their invoices or no accounts match.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuyers.map((b, idx) => {
                    const st = formatPaymentStatus(b.payment_status);
                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{b.buyer_name}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {b.papers_count} {b.papers_count === 1 ? 'Paper' : 'Papers'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {b.papers_list}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {formatMoney(b.total_sales_amount_minor)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main', whiteSpace: 'nowrap' }}>
                          {formatMoney(b.total_amount_received_minor)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 800,
                            color: b.remaining_amount_minor > 0 ? 'error.main' : 'text.secondary',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatMoney(b.remaining_amount_minor)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatHumanDate(b.last_payment_date)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700, minWidth: 90 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => onSelectTab && onSelectTab('trading_sales')}
                            sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.3 }}
                          >
                            Collect Dues
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Stack>
  );
}
