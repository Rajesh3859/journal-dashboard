import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { formatMoney, formatHumanDate, formatPaymentStatus } from '../../utils/humanize';

export default function TradingDashboardView({
  financials = {},
  purchases = [],
  sales = [],
  sellerPayables = [],
  buyerReceivables = [],
  recentTransactions = [],
  onSelectTab,
  onOpenNewPurchase,
  onOpenNewSale,
}) {
  const {
    totalPurchaseValue = 0,
    totalSalesValue = 0,
    grossProfit = 0,
    totalCashPaid = 0,
    totalCashReceived = 0,
    outstandingSellerPayables = 0,
    outstandingBuyerReceivables = 0,
    netCashPosition = 0,
    papersPurchasedCount = purchases.length,
    papersSoldCount = sales.length,
  } = financials;

  // Overview Cards required by specifications
  const overviewCards = [
    {
      title: 'Total Purchase Amount',
      value: formatMoney(totalPurchaseValue),
      subtitle: `${papersPurchasedCount} ${papersPurchasedCount === 1 ? 'Paper' : 'Papers'} Purchased`,
      icon: <ShoppingBagIcon sx={{ color: '#2563EB', fontSize: 26 }} />,
      bg: 'rgba(37, 99, 235, 0.08)',
      borderColor: 'rgba(37, 99, 235, 0.25)',
      tab: 'trading_purchases',
    },
    {
      title: 'Total Sales Amount',
      value: formatMoney(totalSalesValue),
      subtitle: `${papersSoldCount} ${papersSoldCount === 1 ? 'Paper' : 'Papers'} Resold`,
      icon: <PointOfSaleIcon sx={{ color: '#059669', fontSize: 26 }} />,
      bg: 'rgba(5, 150, 105, 0.08)',
      borderColor: 'rgba(5, 150, 105, 0.25)',
      tab: 'trading_sales',
    },
    {
      title: 'Total Profit',
      value: formatMoney(grossProfit),
      subtitle: `Margin on Resold Manuscripts`,
      icon: <TrendingUpIcon sx={{ color: grossProfit >= 0 ? '#10B981' : '#EF4444', fontSize: 26 }} />,
      bg: grossProfit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
      borderColor: grossProfit >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      tab: 'trading_reports',
      highlight: true,
    },
    {
      title: 'Paid to Sellers',
      value: formatMoney(totalCashPaid),
      subtitle: 'Realized Outflow to Sellers',
      icon: <PriceCheckIcon sx={{ color: '#6366F1', fontSize: 26 }} />,
      bg: 'rgba(99, 102, 241, 0.08)',
      borderColor: 'rgba(99, 102, 241, 0.25)',
      tab: 'trading_balances',
    },
    {
      title: 'Received from Buyers',
      value: formatMoney(totalCashReceived),
      subtitle: 'Realized Inflow from Buyers',
      icon: <MonetizationOnIcon sx={{ color: '#0D9488', fontSize: 26 }} />,
      bg: 'rgba(13, 148, 136, 0.08)',
      borderColor: 'rgba(13, 148, 136, 0.25)',
      tab: 'trading_balances',
    },
    {
      title: 'Outstanding Payables',
      value: formatMoney(outstandingSellerPayables),
      subtitle: 'Remaining Amount Owed to Sellers',
      icon: <MoneyOffIcon sx={{ color: outstandingSellerPayables > 0 ? '#F59E0B' : '#64748B', fontSize: 26 }} />,
      bg: outstandingSellerPayables > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(100, 116, 139, 0.06)',
      borderColor: outstandingSellerPayables > 0 ? 'rgba(245, 158, 11, 0.3)' : 'divider',
      tab: 'trading_balances',
    },
    {
      title: 'Outstanding Receivables',
      value: formatMoney(outstandingBuyerReceivables),
      subtitle: 'Remaining Amount to Collect',
      icon: <AccountBalanceWalletIcon sx={{ color: outstandingBuyerReceivables > 0 ? '#D97706' : '#64748B', fontSize: 26 }} />,
      bg: outstandingBuyerReceivables > 0 ? 'rgba(217, 119, 6, 0.08)' : 'rgba(100, 116, 139, 0.06)',
      borderColor: outstandingBuyerReceivables > 0 ? 'rgba(217, 119, 6, 0.3)' : 'divider',
      tab: 'trading_balances',
    },
    {
      title: 'Papers Traded',
      value: `${papersPurchasedCount} / ${papersSoldCount}`,
      subtitle: 'Purchased vs. Sold Ratio',
      icon: <AutoStoriesIcon sx={{ color: '#8B5CF6', fontSize: 26 }} />,
      bg: 'rgba(139, 92, 246, 0.08)',
      borderColor: 'rgba(139, 92, 246, 0.25)',
      tab: 'trading_purchases',
    },
  ];

  // Top pending payables to alert
  const pendingSellers = useMemo(() => {
    return sellerPayables.filter((s) => s.remaining_amount_minor > 0).slice(0, 5);
  }, [sellerPayables]);

  // Top pending receivables to alert
  const pendingBuyers = useMemo(() => {
    return buyerReceivables.filter((b) => b.remaining_amount_minor > 0).slice(0, 5);
  }, [buyerReceivables]);

  return (
    <Stack spacing={2.5}>
      {/* Quick Action Buttons */}
      <Stack direction="row" justifyContent="flex-end" spacing={1.5} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddShoppingCartIcon />}
          onClick={onOpenNewPurchase}
          sx={{ px: 2.2, py: 0.8, fontWeight: 700 }}
        >
          Record Paper Purchase
        </Button>
        <Button
          variant="outlined"
          color="success"
          startIcon={<SellIcon />}
          onClick={onOpenNewSale}
          sx={{
            px: 2.2,
            py: 0.8,
            fontWeight: 700,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(5, 150, 105, 0.05)'),
          }}
        >
          Record Paper Sale
        </Button>
      </Stack>

      {/* 8 Dynamic Overview Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}
      >
        {overviewCards.map((card, idx) => (
          <Card
            key={idx}
            sx={{
              cursor: card.tab ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              border: '1px solid',
              borderColor: card.borderColor || 'divider',
              '&:hover': card.tab
                ? {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 6px 20px rgba(0,0,0,0.4)'
                        : '0 4px 16px rgba(0,0,0,0.08)',
                  }
                : {},
            }}
            onClick={() => card.tab && onSelectTab && onSelectTab(card.tab)}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.2}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.title}
                </Typography>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.bg,
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, color: card.highlight ? 'primary.main' : 'text.primary' }}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Realized Cash Flow vs Expected Profit Summary Pill */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon fontSize="small" color="primary" /> Cash Flow Health vs. Expected Profit
              </Typography>
            </Box>

            <Stack direction="row" spacing={3} divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  REALIZED CASH POSITION
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: netCashPosition >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatMoney(netCashPosition)}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  GROSS SPREAD PROFIT
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatMoney(grossProfit)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Side-by-Side: Urgent Seller Payables & Buyer Receivables */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
        {/* Pending Payables to Sellers */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyOffIcon fontSize="small" sx={{ color: '#F59E0B' }} />
                Pending Seller Payables
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => onSelectTab && onSelectTab('trading_balances')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All
              </Button>
            </Stack>

            {pendingSellers.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '7px' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  All seller payments are completely settled!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  No outstanding liabilities to researchers.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Seller Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Papers</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining Due</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingSellers.map((seller, sIdx) => {
                      const st = formatPaymentStatus(seller.payment_status);
                      return (
                        <TableRow key={sIdx} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{seller.seller_name}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>{seller.papers_count} paper(s)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                            {formatMoney(seller.remaining_amount_minor)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700, height: 22 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Pending Receivables from Buyers */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon fontSize="small" sx={{ color: '#D97706' }} />
                Pending Buyer Receivables
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => onSelectTab && onSelectTab('trading_balances')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All
              </Button>
            </Stack>

            {pendingBuyers.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '7px' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  All buyer balances are fully collected!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zero outstanding receivables from customers.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Buyer Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Papers</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining Due</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingBuyers.map((buyer, bIdx) => {
                      const st = formatPaymentStatus(buyer.payment_status);
                      return (
                        <TableRow key={bIdx} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{buyer.buyer_name}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>{buyer.papers_count} paper(s)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {formatMoney(buyer.remaining_amount_minor)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700, height: 22 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Recent Trading Activities */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLongIcon fontSize="small" color="primary" /> Recent Trading Transactions
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => onSelectTab && onSelectTab('trading_history')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Full Transaction History
            </Button>
          </Stack>

          {recentTransactions.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '7px' }}>
              <Typography variant="body2" color="text.secondary">
                No trading activity recorded yet. Get started by recording a paper purchase!
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Activity Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Paper Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Counterparty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ref / Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.slice(0, 7).map((item, i) => {
                    const isExpense = item.type === 'Purchase' || item.type === 'Seller Payment';
                    const typeColor =
                      item.type === 'Purchase'
                        ? 'primary'
                        : item.type === 'Sale'
                        ? 'success'
                        : item.type === 'Seller Payment'
                        ? 'secondary'
                        : 'info';

                    return (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: '0.84rem' }}>{formatHumanDate(item.date)}</TableCell>
                        <TableCell>
                          <Chip label={item.type} color={typeColor} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{item.party}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: isExpense ? 'text.primary' : 'success.main' }}>
                          {formatMoney(item.amount_minor)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                          {item.payment_method ? `${item.payment_method} ${item.reference ? `(${item.reference})` : ''}` : 'Agreement'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
