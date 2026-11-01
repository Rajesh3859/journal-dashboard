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

  // Overview Cards required by specifications (Clean, Breathable, Minimalist)
  const overviewCards = [
    {
      title: 'Total Purchase Amount',
      value: formatMoney(totalPurchaseValue),
      tab: 'trading_purchases',
    },
    {
      title: 'Total Sales Amount',
      value: formatMoney(totalSalesValue),
      tab: 'trading_sales',
    },
    {
      title: 'Total Profit',
      value: formatMoney(grossProfit),
      tab: 'trading_reports',
      highlight: true,
    },
    {
      title: 'Paid to Sellers',
      value: formatMoney(totalCashPaid),
      tab: 'trading_balances',
    },
    {
      title: 'Received from Buyers',
      value: formatMoney(totalCashReceived),
      tab: 'trading_balances',
    },
    {
      title: 'Outstanding Payables',
      value: formatMoney(outstandingSellerPayables),
      tab: 'trading_balances',
    },
    {
      title: 'Outstanding Receivables',
      value: formatMoney(outstandingBuyerReceivables),
      tab: 'trading_balances',
    },
    {
      title: 'Papers Traded',
      value: `${papersPurchasedCount} / ${papersSoldCount}`,
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
    <Stack spacing={3}>
      {/* Quick Action Buttons */}
      <Stack direction="row" justifyContent="flex-end" spacing={2} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          onClick={onOpenNewPurchase}
          sx={{ px: 2.5, py: 0.9, fontWeight: 700 }}
        >
          Record Paper Purchase
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={onOpenNewSale}
          sx={{ px: 2.5, py: 0.9, fontWeight: 700 }}
        >
          Record Paper Sale
        </Button>
      </Stack>

      {/* 8 Dynamic Overview Cards Grid - Spacious & Icon-free */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2.5,
        }}
      >
        {overviewCards.map((card, idx) => (
          <Card
            key={idx}
            sx={{
              cursor: card.tab ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              border: '1px solid',
              borderColor: card.highlight ? 'primary.main' : 'divider',
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
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.2 }}
              >
                {card.title}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: card.highlight ? 'primary.main' : 'text.primary',
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Realized Cash Flow vs Expected Profit Summary */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Cash Flow Health vs. Expected Profit
              </Typography>
            </Box>

            <Stack direction="row" spacing={4} divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, letterSpacing: '0.05em' }}>
                  REALIZED CASH POSITION
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: 'primary.main',
                    mt: 0.5,
                  }}
                >
                  {formatMoney(netCashPosition)}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, letterSpacing: '0.05em' }}>
                  GROSS SPREAD PROFIT
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                  {formatMoney(grossProfit)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Side-by-Side: Urgent Seller Payables & Buyer Receivables */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Pending Payables to Sellers */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Pending Seller Payables
              </Typography>
              <Button
                size="small"
                onClick={() => onSelectTab && onSelectTab('trading_balances')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All
              </Button>
            </Stack>

            {pendingSellers.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  All seller payments are completely settled
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
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Pending Buyer Receivables
              </Typography>
              <Button
                size="small"
                onClick={() => onSelectTab && onSelectTab('trading_balances')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All
              </Button>
            </Stack>

            {pendingBuyers.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '7px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  All buyer balances are fully collected
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
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Recent Trading Transactions
            </Typography>
            <Button
              size="small"
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
                    const typeColor = item.type === 'Purchase' || item.type === 'Sale' ? 'primary' : 'default';

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
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
