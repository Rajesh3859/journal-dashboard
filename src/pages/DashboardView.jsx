import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Alert,
  Chip,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArticleIcon from '@mui/icons-material/Article';
import GroupsIcon from '@mui/icons-material/Groups';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DescriptionIcon from '@mui/icons-material/Description';

import {
  getInitials,
  getAvatarColor,
  formatMoney,
  formatHumanDate,
  formatWorkType,
  formatRelativeDue,
  parseAuthorsList,
} from '../utils/humanize';


export default function DashboardView({
  projects = [],
  clients = [],
  payments = [],
  overdue = [],
  dueToday = [],
  outstandingMinor = 0,
  fontScale = 1.0,
  onSelectTab,
  setReceiptForm,
}) {
  const summaryStats = [
    {
      label: 'Active Research Works',
      value: projects.length,
      icon: <MenuBookIcon color="primary" />,
      sub: `${clients.length} Active ${clients.length === 1 ? 'Collaborator' : 'Collaborators'}`,
      tab: 'projects',
    },
    {
      label: 'Pending Invoiced Fees',
      value: formatMoney(outstandingMinor),
      icon: <AccountBalanceWalletIcon color="secondary" />,
      sub: `${payments.length} Fee ${payments.length === 1 ? 'Milestone' : 'Milestones'}`,
      tab: 'payments',
    },
    {
      label: 'Due Today',
      value: dueToday.length,
      icon: <EventBusyIcon color={dueToday.length > 0 ? 'warning' : 'disabled'} />,
      sub: dueToday.length > 0 ? 'Requires follow-up today' : 'All up to date!',
      tab: 'payments',
    },
    {
      label: 'Overdue Accounts',
      value: overdue.length,
      icon: <WarningAmberIcon color={overdue.length > 0 ? 'error' : 'disabled'} />,
      sub:
        overdue.length > 0
          ? `${formatMoney(overdue.reduce((s, p) => s + p.balance_minor, 0))} overdue`
          : 'Zero overdue balances',
      tab: 'payments',
      highlight: overdue.length > 0,
    },
  ];

  // Deduplicate urgent payments (overdue + due today)
  const urgentPayments = useMemo(() => {
    const map = new Map();
    [...overdue, ...dueToday].forEach((p) => {
      if (p && p.id != null) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [overdue, dueToday]);

  const recentProjects = projects.slice(0, 10);

  const handleQuickPay = (payment) => {
    if (setReceiptForm) {
      setReceiptForm((prev) => ({
        ...prev,
        obligationId: String(payment.id),
        amount: (payment.balance_minor / 100).toFixed(2),
      }));
    }
    if (onSelectTab) {
      onSelectTab('payments');
    }
  };

  const getWorkTypeIcon = (key) => {
    switch (key) {
      case 'journal':
        return <ArticleIcon sx={{ fontSize: '13px !important' }} />;
      case 'conference':
        return <GroupsIcon sx={{ fontSize: '13px !important' }} />;
      case 'patent':
        return <LightbulbIcon sx={{ fontSize: '13px !important' }} />;
      default:
        return <DescriptionIcon sx={{ fontSize: '13px !important' }} />;
    }
  };

  const urgentPaymentColumns = [
    {
      field: 'client_name',
      headerName: 'Collaborator & Manuscript',
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => {
        const clientName = params.value || 'Collaborator';
        const projectTitle = params.row.project_title || 'Research Manuscript';
        const feeDesc = params.row.description;
        const subtitle = feeDesc ? `${projectTitle} • ${feeDesc}` : projectTitle;

        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              height: '100%',
              minWidth: 0,
              width: '100%',
              py: 0.5,
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: getAvatarColor(clientName),
                fontSize: '0.72rem',
                fontWeight: 700,
                flexShrink: 0,
                borderRadius: '7px',
              }}
            >
              {getInitials(clientName)}
            </Avatar>
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Tooltip title={clientName} enterDelay={300}>
                <Typography
                  variant="body2"
                  fontWeight={750}
                  noWrap
                  sx={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.25,
                    color: 'text.primary',
                  }}
                >
                  {clientName}
                </Typography>
              </Tooltip>
              <Tooltip title={`${projectTitle}${feeDesc ? ` — Milestone: ${feeDesc}` : ''}`} enterDelay={300}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{
                    fontSize: '0.7rem',
                    lineHeight: 1.25,
                    mt: 0.2,
                  }}
                >
                  {subtitle}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'balance_minor',
      headerName: 'Unpaid Balance',
      width: 135,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const formatted = formatMoney(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: '100%', minWidth: 0 }}>
            <Tooltip title={`Unpaid: ${formatted}`} enterDelay={300}>
              <Typography
                variant="body2"
                fontWeight={800}
                color="error.main"
                noWrap
                sx={{ fontSize: '0.8125rem', letterSpacing: '-0.01em', minWidth: 0 }}
              >
                {formatted}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'due_date',
      headerName: 'Urgency',
      width: 165,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const relative = formatRelativeDue(params.value, params.row.due_state);
        const isOverdue = params.row.due_state === 'Overdue';
        const label = isOverdue ? relative.text : 'Due Today';
        const icon = isOverdue ? (
          <WarningAmberIcon sx={{ fontSize: '13px !important' }} />
        ) : (
          <ScheduleIcon sx={{ fontSize: '13px !important' }} />
        );

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Tooltip title={params.value ? `Target deadline: ${formatHumanDate(params.value)}` : 'No date set'}>
              <Chip
                size="small"
                icon={icon}
                label={label}
                color={isOverdue ? 'error' : 'warning'}
                variant="outlined"
                sx={{
                  fontWeight: 650,
                  fontSize: '0.7rem',
                  height: 'auto',
                  minHeight: 22,
                  py: 0.2,
                  borderRadius: '6px',
                  maxWidth: '100%',
                }}
              />
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 90,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => handleQuickPay(params.row)}
            sx={{
              borderRadius: '7px',
              fontSize: '0.7rem',
              py: 0.3,
              px: 0.9,
              fontWeight: 700,
              minWidth: 'unset',
              whiteSpace: 'nowrap',
            }}
          >
            Collect
          </Button>
        </Box>
      ),
    },
  ];

  const recentProjectsColumns = [
    {
      field: 'title',
      headerName: 'Manuscript Title',
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%', minWidth: 0, width: '100%', py: 0.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '7px',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MenuBookIcon sx={{ fontSize: 16 }} color="primary" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            <Tooltip title={params.value || ''} enterDelay={300}>
              <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.8125rem', lineHeight: 1.25 }}>
                {params.value}
              </Typography>
            </Tooltip>
            {params.row.target_name && (
              <Tooltip title={params.row.target_name} enterDelay={300}>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.25, mt: 0.2 }}>
                  {params.row.target_name}
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'client_name',
      headerName: 'Author',
      width: 140,
      renderCell: (params) => {
        const name = params.value || 'Author';
        const authors = parseAuthorsList(params.row.authors);
        const authorTooltip = authors.length > 0
          ? `${name} (Co-authors: ${authors.join(', ')})`
          : name;


        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%', minWidth: 0, width: '100%' }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: getAvatarColor(name),
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: '7px',
                flexShrink: 0,
              }}
            >
              {getInitials(name)}
            </Avatar>
            <Tooltip title={authorTooltip} enterDelay={300}>
              <Typography variant="caption" fontWeight={650} noWrap sx={{ fontSize: '0.74rem', minWidth: 0, flex: 1 }}>
                {name}
                {authors.length > 0 && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', ml: 0.5, fontWeight: 500 }}>
                    (+{authors.length})
                  </Typography>
                )}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'work_type',
      headerName: 'Category',
      width: 155,
      renderCell: (params) => {
        const meta = formatWorkType(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
            <Chip
              size="small"
              icon={getWorkTypeIcon(meta.key)}
              label={meta.label}
              color={meta.color}
              variant="outlined"
              sx={{ fontSize: '0.7rem', fontWeight: 600, height: 'auto', minHeight: 22, py: 0.2, borderRadius: '6px' }}
            />
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 80,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <Button
            size="small"
            variant="text"
            color="primary"
            onClick={() => onSelectTab('projects')}
            sx={{ fontSize: '0.72rem', py: 0.2, px: 0.6, fontWeight: 700, borderRadius: '7px' }}
          >
            View
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 }, flexGrow: 1, width: '100%' }}>
      {/* Actionable Alerts */}
      {overdue.length > 0 && (
        <Alert
          severity="error"
          sx={{ borderRadius: '7px' }}
          action={
            <Button
              color="inherit"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => onSelectTab('payments')}
            >
              Follow Up
            </Button>
          }
        >
          <strong>Overdue Notice:</strong> You have {overdue.length} {overdue.length === 1 ? 'overdue payment milestone' : 'overdue payment milestones'} totaling{' '}
          {formatMoney(overdue.reduce((sum, p) => sum + p.balance_minor, 0))}. Reaching out to clients helps reconcile accounts promptly.
        </Alert>
      )}

      {dueToday.length > 0 && (
        <Alert
          severity="warning"
          sx={{ borderRadius: '7px' }}
          action={
            <Button
              color="inherit"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => onSelectTab('payments')}
            >
              Review
            </Button>
          }
        >
          <strong>Due Today:</strong> {dueToday.length} {dueToday.length === 1 ? 'payment milestone is' : 'payment milestones are'} scheduled for settlement today.
        </Alert>
      )}

      {/* Humanized Welcome & KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {summaryStats.map((item) => (
          <Card
            key={item.label}
            variant="outlined"
            onClick={() => onSelectTab(item.tab)}
            sx={{
              borderRadius: '7px',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              border: item.highlight ? '1.5px solid' : '1px solid',
              borderColor: item.highlight ? 'error.main' : 'divider',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 2,
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {item.label}
                  </Typography>
                  <Tooltip title={String(item.value)} enterDelay={300}>
                    <Typography variant="h5" fontWeight={800} noWrap sx={{ mt: 0.8, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.value}
                    </Typography>
                  </Tooltip>
                </Box>
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: '7px',
                    bgcolor: item.highlight ? 'error.light' : 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
              </Stack>
              <Tooltip title={item.sub} enterDelay={300}>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', wordBreak: 'break-word', lineHeight: 1.35 }}>
                  {item.sub}
                </Typography>
              </Tooltip>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Quick Action Shortcuts */}
      <Card variant="outlined" sx={{ borderRadius: '7px' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="caption" fontWeight={750} color="text.secondary" sx={{ mb: 1.2, display: 'block', letterSpacing: '0.05em' }}>
            QUICK WORKSPACE ACTIONS
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonAddIcon fontSize="small" />}
              onClick={() => onSelectTab('clients')}
              sx={{ borderRadius: '7px', fontSize: '0.8rem', fontWeight: 650 }}
            >
              Add Collaborator
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PostAddIcon fontSize="small" />}
              onClick={() => onSelectTab('projects')}
              sx={{ borderRadius: '7px', fontSize: '0.8rem', fontWeight: 650 }}
            >
              Start New Research Work
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCardIcon fontSize="small" />}
              onClick={() => onSelectTab('payments')}
              sx={{ borderRadius: '7px', fontSize: '0.8rem', fontWeight: 650 }}
            >
              Schedule Agreed Fee
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AccountBalanceWalletIcon fontSize="small" />}
              onClick={() => onSelectTab('payments')}
              sx={{ borderRadius: '7px', fontSize: '0.8rem', fontWeight: 650 }}
            >
              Log Client Payment
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Two columns with MUI X DataGrids: Urgent Payments & Recent Projects */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
          alignItems: 'stretch',
          flexGrow: 1,
        }}
      >
        {/* Urgent Payments Follow-up */}
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberIcon color="error" fontSize="small" />
                  <Typography variant="h6" fontWeight={750} sx={{ fontSize: '1rem' }}>
                    Follow-up Needed
                  </Typography>
                  {urgentPayments.length > 0 && (
                    <Chip
                      size="small"
                      label={`${urgentPayments.length} Action Required`}
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20, borderRadius: '7px' }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                  Overdue milestones and payments requiring client communication
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => onSelectTab('payments')}
                sx={{ borderRadius: '7px' }}
              >
                All Fees
              </Button>
            </Stack>
            <Divider sx={{ my: 1.2 }} />

            {urgentPayments.length > 0 ? (
              <Box sx={{ flexGrow: 1, height: { xs: 340, sm: 380, md: 430, lg: 480 }, minHeight: '22rem', width: '100%' }}>
                <DataGrid
                  rows={urgentPayments}
                  columns={urgentPaymentColumns}
                  pageSizeOptions={[5]}
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
            ) : (
              <Box
                sx={{
                  height: { xs: 260, sm: 280, md: 300 },
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: 44, mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  All caught up!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  No overdue or immediate payment milestones are pending today.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MenuBookIcon color="primary" fontSize="small" />
                  <Typography variant="h6" fontWeight={750} sx={{ fontSize: '1rem' }}>
                    Recent Research Works
                  </Typography>
                  {recentProjects.length > 0 && (
                    <Chip
                      size="small"
                      label={`${recentProjects.length} Manuscripts`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20, borderRadius: '7px' }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                  Latest active manuscripts and academic deliverables
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => onSelectTab('projects')}
                sx={{ borderRadius: '7px' }}
              >
                All Works
              </Button>
            </Stack>
            <Divider sx={{ my: 1.2 }} />

            {recentProjects.length > 0 ? (
              <Box sx={{ flexGrow: 1, height: { xs: 340, sm: 380, md: 430, lg: 480 }, minHeight: '22rem', width: '100%' }}>
                <DataGrid
                  rows={recentProjects}
                  columns={recentProjectsColumns}
                  pageSizeOptions={[5]}
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
            ) : (
              <Box
                sx={{
                  height: { xs: 260, sm: 280, md: 300 },
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <MenuBookIcon color="disabled" sx={{ fontSize: 44, mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  No research works yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click 'Start New Research Work' above to register your first manuscript.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
