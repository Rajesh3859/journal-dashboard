import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

import { formatMoney } from '../../utils/humanize';

export default function TradingReportsView({
  financials = {},
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
    papersPurchasedCount = 0,
    papersSoldCount = 0,
    monthlySummary = [],
  } = financials;

  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Maximum value for SVG chart scaling
  const maxChartValue = useMemo(() => {
    let max = 100000;
    monthlySummary.forEach((m) => {
      max = Math.max(max, m.purchasesValue || 0, m.salesValue || 0, m.cashReceived || 0);
    });
    return max;
  }, [monthlySummary]);

  return (
    <Stack spacing={2.5}>
      {/* 3 Core Financial Pillars */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {/* Pillar 1: Contract Spread & Profitability */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <TrendingUpIcon color="success" />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contract Profitability
              </Typography>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              GROSS SPREAD PROFIT
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', mb: 1.5 }}>
              {formatMoney(grossProfit)}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Sales Value:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totalSalesValue)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Purchase Value:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totalPurchaseValue)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Papers Sold vs Bought:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{papersSoldCount} / {papersPurchasedCount}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Pillar 2: Realized Cash Position */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <MonetizationOnIcon color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Realized Cash Flow
              </Typography>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              NET CASH POSITION
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: netCashPosition >= 0 ? 'primary.main' : 'error.main',
                mb: 1.5,
              }}
            >
              {formatMoney(netCashPosition)}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Cash Received (Inflow):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>+{formatMoney(totalCashReceived)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Cash Paid (Outflow):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>-{formatMoney(totalCashPaid)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Cash Liquidity Ratio:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {totalCashPaid > 0 ? `${(totalCashReceived / totalCashPaid).toFixed(2)}x` : '—'}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Pillar 3: Pending Balances & Working Capital */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <AccountBalanceWalletIcon sx={{ color: '#D97706' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Working Capital Pipeline
              </Typography>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              OUTSTANDING BUYER RECEIVABLES
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.dark', mb: 1.5 }}>
              {formatMoney(outstandingBuyerReceivables)}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Buyer Receivables (To Collect):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>{formatMoney(outstandingBuyerReceivables)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Seller Payables (To Disburse):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>{formatMoney(outstandingSellerPayables)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Net Pipeline Clearance:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatMoney(outstandingBuyerReceivables - outstandingSellerPayables)}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Visual Chart: Monthly Purchases vs Sales vs Gross Profit */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              12-Month Trading Trends & Profit Performance
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: { xs: 1, sm: 0 } }}>
              <Stack direction="row" alignItems="center" spacing={0.6}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#2563EB', borderRadius: '3px' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Purchases</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.6}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#059669', borderRadius: '3px' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Sales</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.6}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#10B981', borderRadius: '3px' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Gross Profit</Typography>
              </Stack>
            </Stack>
          </Stack>

          {/* SVG Bar Chart Visualization */}
          <Box sx={{ width: '100%', overflowX: 'auto', py: 1 }}>
            <Box sx={{ minWidth: 640, height: 220, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 1.5, px: 2, pt: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              {monthlySummary.map((m, idx) => {
                const pHeight = Math.max(4, Math.round(((m.purchasesValue || 0) / maxChartValue) * 160));
                const sHeight = Math.max(4, Math.round(((m.salesValue || 0) / maxChartValue) * 160));
                const profitHeight = Math.max(2, Math.round((Math.max(0, m.grossProfit || 0) / maxChartValue) * 160));

                const isHovered = hoveredMonth === idx;

                return (
                  <Box
                    key={idx}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                      opacity: hoveredMonth !== null && !isHovered ? 0.45 : 1,
                    }}
                  >
                    {/* Tooltip hovering indicator */}
                    {isHovered && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'background.paper',
                          p: 1,
                          borderRadius: '6px',
                          boxShadow: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          zIndex: 10,
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                          {m.label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>
                          Sales: {formatMoney(m.salesValue)} ({m.salesCount} sold)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          Purchases: {formatMoney(m.purchasesValue)} ({m.purchasesCount} bought)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'success.main', fontWeight: 700 }}>
                          Gross Profit: {formatMoney(m.grossProfit)}
                        </Typography>
                      </Box>
                    )}

                    {/* Clustered Bars */}
                    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 170 }}>
                      {/* Purchases Bar */}
                      <Box
                        sx={{
                          width: { xs: 8, sm: 14 },
                          height: `${pHeight}px`,
                          bgcolor: '#2563EB',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      {/* Sales Bar */}
                      <Box
                        sx={{
                          width: { xs: 8, sm: 14 },
                          height: `${sHeight}px`,
                          bgcolor: '#059669',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      {/* Profit Bar */}
                      <Box
                        sx={{
                          width: { xs: 6, sm: 10 },
                          height: `${profitHeight}px`,
                          bgcolor: '#10B981',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: '0.72rem', fontWeight: 600 }}>
                      {m.label.split(' ')[0]}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Monthly Summary Breakdown Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Monthly Financial Summary Breakdown
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Papers Bought</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Papers Sold</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Purchase Value</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Sales Value</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Profit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Cash Paid</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Cash Received</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Net Cashflow</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlySummary.map((m, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.label}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.85rem' }}>{m.purchasesCount}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.85rem' }}>{m.salesCount}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{formatMoney(m.purchasesValue)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatMoney(m.salesValue)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: (m.grossProfit || 0) >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      {formatMoney(m.grossProfit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{formatMoney(m.cashPaid)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{formatMoney(m.cashReceived)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: (m.netCashFlow || 0) >= 0 ? 'primary.main' : 'warning.dark',
                      }}
                    >
                      {formatMoney(m.netCashFlow)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}
