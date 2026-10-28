import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  InputAdornment,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { getInitials, getAvatarColor, formatMoney, formatHumanDate } from '../utils/humanize';

export default function HistoryView({
  paymentHistory = [],
  fontScale = 1.0,
}) {
  const [search, setSearch] = useState('');

  const filteredHistory = paymentHistory.filter((receipt) => {
    const q = search.toLowerCase();
    return (
      receipt.client_name?.toLowerCase().includes(q) ||
      receipt.project_title?.toLowerCase().includes(q) ||
      receipt.payment_description?.toLowerCase().includes(q) ||
      receipt.notes?.toLowerCase().includes(q) ||
      receipt.payment_date?.toLowerCase().includes(q)
    );
  });

  const totalCollected = paymentHistory.reduce(
    (sum, r) => sum + (r.amount_minor || 0),
    0
  );

  const columns = [
    {
      field: 'payment_date',
      headerName: 'Date Received',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%', minWidth: 0, width: '100%' }}>
          <EventAvailableIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.8125rem' }}>
              {formatHumanDate(params.value)}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem', display: 'block' }}>
              Receipt #{params.row.id}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'client_name',
      headerName: 'Collaborator / Client',
      flex: 1.1,
      minWidth: 165,
      renderCell: (params) => {
        const name = params.value || 'Client';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: getAvatarColor(name),
                width: 24,
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(name)}
            </Avatar>
            <Tooltip title={name} enterDelay={300}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem', minWidth: 0, flex: 1 }}>
                {name}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'project_title',
      headerName: 'Research Manuscript',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%', minWidth: 0, width: '100%' }}>
          <MenuBookIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
          <Tooltip title={params.value || ''} enterDelay={300}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem', minWidth: 0, flex: 1 }}>
              {params.value}
            </Typography>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: 'payment_description',
      headerName: 'Fee Milestone',
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
      field: 'amount_minor',
      headerName: 'Amount Collected',
      width: 145,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const text = `+ ${formatMoney(params.value)}`;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: '100%', minWidth: 0 }}>
            <Tooltip title={text} enterDelay={300}>
              <Typography variant="body2" fontWeight={800} color="success.main" noWrap sx={{ fontSize: '0.8125rem', minWidth: 0 }}>
                {text}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'notes',
      headerName: 'Transaction Reference / Notes',
      flex: 1.1,
      minWidth: 140,
      renderCell: (params) => {
        const noteText = params.value || 'Direct payment recorded';
        return (
          <Tooltip title={noteText} enterDelay={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', minWidth: 0, width: '100%' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ fontSize: '0.72rem', minWidth: 0, width: '100%' }}
              >
                {noteText}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 }, flexGrow: 1, width: '100%' }}>
      {/* Humanized Metrics Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8125rem' }}>
                  Total Completed Receipts
                </Typography>
                <Typography variant="h5" fontWeight={800} noWrap sx={{ mt: 0.5, letterSpacing: '-0.02em' }}>
                  {paymentHistory.length}
                </Typography>
                <Tooltip title="Immutable log of all client settlements" enterDelay={300}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.3, display: 'block', fontSize: '0.7rem' }}>
                    Immutable log of all client settlements
                  </Typography>
                </Tooltip>
              </Box>
              <Avatar sx={{ bgcolor: 'action.hover', width: 38, height: 38, flexShrink: 0 }}>
                <ReceiptLongIcon color="primary" sx={{ fontSize: 20 }} />
              </Avatar>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8125rem' }}>
                  Total Collected Revenue
                </Typography>
                <Tooltip title={formatMoney(totalCollected)} enterDelay={300}>
                  <Typography variant="h5" fontWeight={800} color="success.main" noWrap sx={{ mt: 0.5, letterSpacing: '-0.02em' }}>
                    {formatMoney(totalCollected)}
                  </Typography>
                </Tooltip>
                <Tooltip title="Realized funds deposited across all research works" enterDelay={300}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.3, display: 'block', fontSize: '0.7rem' }}>
                    Realized funds deposited across all research works
                  </Typography>
                </Tooltip>
              </Box>
              <Avatar sx={{ bgcolor: 'success.light', width: 38, height: 38, flexShrink: 0 }}>
                <TrendingUpIcon color="success" sx={{ fontSize: 20 }} />
              </Avatar>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* MUI X DataGrid: Payment History Ledger */}
      <Card variant="outlined" sx={{ borderRadius: '7px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <ReceiptLongIcon color="primary" />
                <Typography variant="h6" fontWeight={750}>
                  Payment Transaction History
                </Typography>
                <Chip
                  size="small"
                  label={`${paymentHistory.length} ${paymentHistory.length === 1 ? 'Record' : 'Records'}`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Complete chronological audit log of all received payments and ledger transactions.
              </Typography>
            </Box>

            <TextField
              size="small"
              placeholder="Search receipts & references…"
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
                width: { xs: '100%', sm: 260 },
                flexShrink: 0,
                '& .MuiInputBase-root': { height: 36, borderRadius: '6px' },
              }}
            />
          </Stack>

          <Box sx={{ flexGrow: 1, height: { xs: 420, sm: 480, md: 540, lg: 600, xl: 660 }, minHeight: '26rem', width: '100%' }}>
            <DataGrid
              rows={filteredHistory}
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
    </Box>
  );
}
