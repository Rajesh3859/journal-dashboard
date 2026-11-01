import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  InputAdornment,
  Chip,
  Avatar,
  Tooltip,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DateRangeIcon from '@mui/icons-material/DateRange';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArticleIcon from '@mui/icons-material/Article';
import GroupsIcon from '@mui/icons-material/Groups';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LaunchIcon from '@mui/icons-material/Launch';
import TableChartIcon from '@mui/icons-material/TableChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { exportCollaboratorWorksToExcel } from '../utils/excelExport';
import {
  getInitials,
  getAvatarColor,
  formatHumanDate,
  formatWorkType,
  parseAuthorsList,
  formatMoney,
} from '../utils/humanize';

export default function ClientsView({
  clients = [],
  projects = [],
  payments = [],
  clientForm,
  setClientForm,
  saveClient,
  loading,
  fontScale = 1.0,
  money,
}) {
  const [search, setSearch] = useState('');

  // Collaborator Works Popup Modal State
  const [activeCollaboratorModal, setActiveCollaboratorModal] = useState(null);
  const [durationPreset, setDurationPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [workRoleFilter, setWorkRoleFilter] = useState('all');
  const [workSearchQuery, setWorkSearchQuery] = useState('');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');
  const [saveClientConfirmOpen, setSaveClientConfirmOpen] = useState(false);

  const handleRequestSaveClient = (e) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.name.trim()) return;
    setSaveClientConfirmOpen(true);
  };

  const handleConfirmSaveClient = (e) => {
    saveClient(e);
    setSaveClientConfirmOpen(false);
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
        return <MenuBookIcon sx={{ fontSize: '13px !important' }} />;
    }
  };

  // Find all works a collaborator has given (as lead client) OR is involved in (as co-author)
  const getCollaboratorWorks = (collaborator) => {
    if (!collaborator) return [];
    return projects
      .filter((p) => {
        // Given as lead author / client
        if (p.client_id === collaborator.id || p.client_name === collaborator.name) {
          return true;
        }
        // Involved as co-author
        const rawAuthors = Array.isArray(p.authors) ? p.authors : [];
        return rawAuthors.some((a) => {
          if (typeof a === 'string') {
            return a.toLowerCase().trim() === (collaborator.name || '').toLowerCase().trim();
          }
          if (a && typeof a === 'object') {
            const matchName = a.name && a.name.toLowerCase().trim() === (collaborator.name || '').toLowerCase().trim();
            const matchEmail = a.email && collaborator.email && a.email.toLowerCase().trim() === collaborator.email.toLowerCase().trim();
            return matchName || matchEmail;
          }
          return false;
        });
      })
      .map((p) => {
        const isLead = p.client_id === collaborator.id || p.client_name === collaborator.name;
        let role = isLead ? 'Lead Author / Sponsor' : 'Contributing Co-Author';
        if (!isLead && Array.isArray(p.authors)) {
          const matchObj = p.authors.find(
            (a) =>
              typeof a === 'object' &&
              ((a.name && a.name.toLowerCase().trim() === (collaborator.name || '').toLowerCase().trim()) ||
                (a.email && collaborator.email && a.email.toLowerCase().trim() === collaborator.email.toLowerCase().trim()))
          );
          if (matchObj && matchObj.role) {
            role = matchObj.role;
          }
        }

        // Attach linked payment info if any
        const linkedPayment = payments.find((pay) => pay.project_id === p.id);
        const paymentInfo = linkedPayment
          ? {
              status: linkedPayment.status,
              amountDue: linkedPayment.amount_due_minor,
              received: linkedPayment.received_minor,
              balance: linkedPayment.balance_minor,
              dueState: linkedPayment.due_state,
            }
          : null;

        return {
          ...p,
          involvementRole: role,
          isLead,
          paymentInfo,
        };
      });
  };

  const handleOpenWorksModal = (collaborator) => {
    setActiveCollaboratorModal(collaborator);
    setDurationPreset('all');
    setStartDate('');
    setEndDate('');
    setWorkTypeFilter('all');
    setWorkRoleFilter('all');
    setWorkSearchQuery('');
  };

  const handleCloseWorksModal = () => {
    setActiveCollaboratorModal(null);
  };

  const handlePresetChange = (preset) => {
    setDurationPreset(preset);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_year') {
      const year = new Date().getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (preset === 'last_6_months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // Resolved works for the currently inspected collaborator
  const allCollaboratorWorks = useMemo(() => {
    if (!activeCollaboratorModal) return [];
    return getCollaboratorWorks(activeCollaboratorModal);
  }, [activeCollaboratorModal, projects, payments]);

  // Filtered by custom duration, work type, role, and search
  const filteredCollaboratorWorks = useMemo(() => {
    return allCollaboratorWorks.filter((work) => {
      // 1. Duration / Date Filter
      const workDate = work.commitment_date || (work.created_at ? work.created_at.slice(0, 10) : '');
      if (startDate && workDate && workDate < startDate) return false;
      if (endDate && workDate && workDate > endDate) return false;

      // 2. Category Filter
      if (workTypeFilter !== 'all' && work.work_type !== workTypeFilter) return false;

      // 3. Role Filter
      if (workRoleFilter === 'lead' && !work.isLead) return false;
      if (workRoleFilter === 'coauthor' && work.isLead) return false;

      // 4. Search Filter
      if (workSearchQuery.trim()) {
        const q = workSearchQuery.toLowerCase();
        const authorsList = parseAuthorsList(work.authors);
        const matchTitle = work.title?.toLowerCase().includes(q);
        const matchVenue = work.target_name?.toLowerCase().includes(q);
        const matchAuthors = authorsList.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchVenue && !matchAuthors) return false;
      }

      return true;
    });
  }, [allCollaboratorWorks, startDate, endDate, workTypeFilter, workRoleFilter, workSearchQuery]);

  const handleExportExcel = () => {
    if (!activeCollaboratorModal) return;
    const presetLabels = {
      all: 'All Time',
      this_year: `This Year (${new Date().getFullYear()})`,
      last_6_months: 'Last 6 Months',
      last_30_days: 'Last 30 Days',
      custom: 'Custom Range',
    };
    const fileName = exportCollaboratorWorksToExcel(
      activeCollaboratorModal,
      filteredCollaboratorWorks,
      {
        startDate,
        endDate,
        presetLabel: presetLabels[durationPreset] || (startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'),
      }
    );
    setDownloadSuccessMsg(`Excel dossier downloaded: ${fileName}`);
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.organization?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      field: 'name',
      headerName: 'Collaborator / Author',
      flex: 1.2,
      minWidth: 165,
      renderCell: (params) => {
        const name = params.row.name || 'Unknown Author';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: getAvatarColor(name),
                width: 26,
                height: 26,
                fontSize: '0.72rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(name)}
            </Avatar>
            <Box sx={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <Tooltip title={name} enterDelay={300}>
                <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.8rem' }}>
                  {name}
                </Typography>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block' }}>
                {params.row.orcid ? `ORCID: ${params.row.orcid}` : 'Registered Collaborator'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'organization',
      headerName: 'Institution / Affiliation',
      flex: 1,
      minWidth: 155,
      renderCell: (params) => {
        const org = params.value || 'Independent Researcher';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%', minWidth: 0, width: '100%' }}>
            <BusinessIcon sx={{ color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
            <Tooltip title={org} enterDelay={300}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontSize: '0.78rem', minWidth: 0, flex: 1 }}
                color={params.value ? 'text.primary' : 'text.secondary'}
              >
                {org}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'contact',
      headerName: 'Contact Information',
      flex: 1.4,
      minWidth: 230,
      renderCell: (params) => {
        const { email, phone } = params.row;
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: '100%',
              minWidth: 0,
              gap: 0.35,
              py: 0.5,
            }}
          >
            {email ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, width: '100%' }}>
                <EmailIcon sx={{ fontSize: 13, color: 'primary.main', flexShrink: 0 }} />
                <Tooltip title={email} enterDelay={300}>
                  <Link
                    href={`mailto:${email}`}
                    underline="hover"
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      lineHeight: 1.25,
                      minWidth: 0,
                      flex: 1,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {email}
                  </Link>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, width: '100%' }}>
                <EmailIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.25 }}>
                  No email listed
                </Typography>
              </Box>
            )}
            {phone ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, width: '100%' }}>
                <PhoneIcon sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }} />
                <Tooltip title={phone} enterDelay={300}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      lineHeight: 1.25,
                      minWidth: 0,
                      flex: 1,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {phone}
                  </Typography>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, width: '100%' }}>
                <PhoneIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.25 }}>
                  No phone listed
                </Typography>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      field: 'projectsCount',
      headerName: 'Research Works',
      width: 125,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => {
        return getCollaboratorWorks(row).length;
      },
      renderCell: (params) => {
        const count = params.value;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Tooltip title="Click to open works dossier & download Excel file with custom duration">
              <Chip
                icon={<AutoStoriesIcon sx={{ fontSize: '13px !important' }} />}
                size="small"
                label={count === 1 ? '1 work' : `${count} works`}
                color={count > 0 ? 'primary' : 'default'}
                variant={count > 0 ? 'filled' : 'outlined'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenWorksModal(params.row);
                }}
                sx={{
                  fontWeight: 650,
                  fontSize: '0.72rem',
                  height: 24,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.06)',
                    boxShadow: 2,
                  },
                }}
              />
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'notes',
      headerName: 'Notes & Context',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Tooltip title={params.value || 'No additional notes'} enterDelay={300}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', minWidth: 0, width: '100%' }}>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ fontSize: '0.76rem', minWidth: 0, width: '100%' }}
            >
              {params.value || '—'}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Registered',
      width: 115,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', minWidth: 0, width: '100%' }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
            {formatHumanDate(params.value?.slice(0, 10))}
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1, width: '100%' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'clamp(310px, 22rem, 380px) 1fr' },
          gap: 2.5,
          alignItems: 'stretch',
          flexGrow: 1,
        }}
      >
        {/* Form: Add Client */}
        <Card variant="outlined" sx={{ borderRadius: '7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={750} sx={{ fontSize: '0.95rem' }}>
                Register Collaborator
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Add an author, client, or research partner
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />

            <Box component="form" onSubmit={handleRequestSaveClient} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                <TextField
                  label="Full Name & Title"
                  required
                  fullWidth
                  size="small"
                  placeholder="e.g. Dr. Jane Smith"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  helperText="Primary author or representative name"
                />
                <TextField
                  label="Institution / University"
                  fullWidth
                  size="small"
                  placeholder="e.g. Stanford University"
                  value={clientForm.organization}
                  onChange={(e) => setClientForm({ ...clientForm, organization: e.target.value })}
                />
                <TextField
                  label="Primary Email Address"
                  type="email"
                  fullWidth
                  size="small"
                  placeholder="author@institution.edu"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                />
                <TextField
                  label="Phone / WhatsApp Contact"
                  fullWidth
                  size="small"
                  placeholder="+91 98765 43210"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                />
                <TextField
                  label="Research Context & Background"
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  placeholder="Specialization, ongoing grant projects..."
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 'auto', py: 1, fontWeight: 700 }}
                >
                  Save Collaborator
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* MUI X DataGrid: Clients Directory */}
        <Card variant="outlined" sx={{ borderRadius: '7px', minWidth: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PeopleIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={750} sx={{ fontSize: '0.98rem' }}>
                    Collaborators & Authors Directory
                  </Typography>
                  <Chip
                    size="small"
                    label={`${clients.length} ${clients.length === 1 ? 'Collaborator' : 'Collaborators'}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, height: 20, fontSize: '0.68rem' }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                  Comprehensive directory of research partners, lead investigators, and affiliated co-authors.
                </Typography>
              </Box>

              <TextField
                size="small"
                placeholder="Search collaborators…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16 }} color="action" />
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
            </Stack>

            <Box sx={{ flexGrow: 1, height: { xs: 400, sm: 460, md: 520, lg: 580, xl: 640 }, minHeight: '24rem', width: '100%', minWidth: 0 }}>
              <DataGrid
                rows={filteredClients}
                columns={columns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5, page: 0 } },
                }}
                disableRowSelectionOnClick
                onRowClick={(params) => handleOpenWorksModal(params.row)}
                rowHeight={Math.round(58 * (fontScale || 1))}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  '& .MuiDataGrid-columnHeaders': {
                    bgcolor: 'action.hover',
                    fontWeight: 700,
                  },
                  '& .MuiDataGrid-row': {
                    cursor: 'pointer',
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

      {/* Collaborator Works Dossier Pop-Up Window with Background Blur */}
      <Dialog
        open={Boolean(activeCollaboratorModal)}
        onClose={handleCloseWorksModal}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
            },
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {activeCollaboratorModal && (
          <>
            {/* Modal Header */}
            <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                  <Avatar
                    sx={{
                      bgcolor: getAvatarColor(activeCollaboratorModal.name),
                      width: 44,
                      height: 44,
                      fontSize: '1.05rem',
                      fontWeight: 750,
                      boxShadow: 2,
                    }}
                  >
                    {getInitials(activeCollaboratorModal.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="h6" fontWeight={750} sx={{ fontSize: '1.15rem' }}>
                        {activeCollaboratorModal.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" sx={{ mt: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BusinessIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {activeCollaboratorModal.organization || 'Independent Researcher'}
                        </Typography>
                      </Box>
                      {activeCollaboratorModal.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {activeCollaboratorModal.email}
                          </Typography>
                        </Box>
                      )}
                      {activeCollaboratorModal.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {activeCollaboratorModal.phone}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    icon={<ArticleIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Lead Author: ${allCollaboratorWorks.filter((w) => w.isLead).length}`}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{ fontWeight: 650, display: { xs: 'none', md: 'inline-flex' } }}
                  />
                  <Chip
                    icon={<GroupsIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Co-Author: ${allCollaboratorWorks.filter((w) => !w.isLead).length}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 650, display: { xs: 'none', md: 'inline-flex' } }}
                  />
                  <IconButton onClick={handleCloseWorksModal} size="small" sx={{ color: 'text.secondary' }}>
                    <CloseIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </DialogTitle>

            {/* Modal Body with Custom Duration Filter & Works Table */}
            <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Duration and Search Controls Card */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: '9px',
                  bgcolor: 'action.hover',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <DateRangeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Custom Duration & Filter Toolbar
                      </Typography>
                    </Stack>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<FileDownloadIcon />}
                      onClick={handleExportExcel}
                      sx={{
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: '7px',
                        px: 2,
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      Download Excel (.xlsx)
                    </Button>
                  </Stack>

                  {/* Filter Inputs Grid */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(5, 1fr)',
                      },
                      gap: 1.5,
                      alignItems: 'center',
                    }}
                  >
                    {/* Duration Preset */}
                    <FormControl size="small" fullWidth>
                      <InputLabel id="duration-preset-label">Duration Period</InputLabel>
                      <Select
                        labelId="duration-preset-label"
                        value={durationPreset}
                        label="Duration Period"
                        onChange={(e) => handlePresetChange(e.target.value)}
                        sx={{ borderRadius: '7px', fontSize: '0.82rem' }}
                      >
                        <MenuItem value="all">All Time (Full Dossier)</MenuItem>
                        <MenuItem value="this_year">This Year ({new Date().getFullYear()})</MenuItem>
                        <MenuItem value="last_6_months">Last 6 Months</MenuItem>
                        <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                        <MenuItem value="custom">Custom Date Range</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Start Date */}
                    <TextField
                      size="small"
                      type="date"
                      label="From Date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDurationPreset('custom');
                      }}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                          sx: {
                            bgcolor: 'background.paper',
                            px: 0.6,
                            borderRadius: '4px',
                          },
                        },
                        htmlInput: {
                          sx: {
                            fontSize: '0.82rem',
                          },
                        },
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        minWidth: { xs: '100%', sm: 140 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '7px',
                          fontSize: '0.82rem',
                        },
                      }}
                    />

                    {/* End Date */}
                    <TextField
                      size="small"
                      type="date"
                      label="To Date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDurationPreset('custom');
                      }}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                          sx: {
                            bgcolor: 'background.paper',
                            px: 0.6,
                            borderRadius: '4px',
                          },
                        },
                        htmlInput: {
                          sx: {
                            fontSize: '0.82rem',
                          },
                        },
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        minWidth: { xs: '100%', sm: 140 },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '7px',
                          fontSize: '0.82rem',
                        },
                      }}
                    />

                    {/* Work Role Filter */}
                    <FormControl size="small" fullWidth>
                      <InputLabel id="role-filter-label">Involvement</InputLabel>
                      <Select
                        labelId="role-filter-label"
                        value={workRoleFilter}
                        label="Involvement"
                        onChange={(e) => setWorkRoleFilter(e.target.value)}
                        sx={{ borderRadius: '7px', fontSize: '0.82rem' }}
                      >
                        <MenuItem value="all">All (Given & Involved)</MenuItem>
                        <MenuItem value="lead">Given by Collaborator (Lead)</MenuItem>
                        <MenuItem value="coauthor">Involved as Co-Author</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Quick Search */}
                    <TextField
                      size="small"
                      placeholder="Search title, venue, author..."
                      value={workSearchQuery}
                      onChange={(e) => setWorkSearchQuery(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 16 }} color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: '0.82rem' } }}
                    />
                  </Box>

                  {/* Active Duration Status Line */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                      Showing <strong>{filteredCollaboratorWorks.length}</strong> of{' '}
                      <strong>{allCollaboratorWorks.length}</strong> works
                      {startDate && endDate ? ` between ${startDate} and ${endDate}` : ''}
                      {durationPreset !== 'all' && !startDate ? ` (${durationPreset.replace(/_/g, ' ')})` : ''}
                    </Typography>
                    {(durationPreset !== 'all' || startDate || endDate || workRoleFilter !== 'all' || workSearchQuery) && (
                      <Button
                        size="small"
                        onClick={() => {
                          setDurationPreset('all');
                          setStartDate('');
                          setEndDate('');
                          setWorkTypeFilter('all');
                          setWorkRoleFilter('all');
                          setWorkSearchQuery('');
                        }}
                        sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0 }}
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>

              {/* Works Table */}
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderRadius: '9px',
                  maxHeight: '48vh',
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', width: 42 }}>
                        #
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 260 }}>
                        Research Work Title & Details
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 155 }}>
                        Involvement Role
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 130 }}>
                        Category
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 180 }}>
                        Authors Involved
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 140 }}>
                        Target Venue / Journal
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 110 }}>
                        Target Date
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 110 }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.78rem', bgcolor: 'action.hover', minWidth: 140 }}>
                        Finances
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCollaboratorWorks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <MenuBookIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                            <Typography variant="subtitle1" fontWeight={650} color="text.secondary">
                              No research works found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                              {allCollaboratorWorks.length === 0
                                ? 'This collaborator has not initiated or contributed to any recorded research works yet.'
                                : 'No works match the selected custom duration or filter criteria. Try adjusting or resetting your filters.'}
                            </Typography>
                            {allCollaboratorWorks.length > 0 && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setDurationPreset('all');
                                  setStartDate('');
                                  setEndDate('');
                                  setWorkTypeFilter('all');
                                  setWorkRoleFilter('all');
                                  setWorkSearchQuery('');
                                }}
                                sx={{ mt: 1, borderRadius: '6px', textTransform: 'none' }}
                              >
                                Clear Duration Filters
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCollaboratorWorks.map((work, idx) => {
                        const wt = formatWorkType(work.work_type);
                        const authors = parseAuthorsList(work.authors);
                        const isLead = work.isLead;

                        return (
                          <TableRow
                            key={work.id || idx}
                            hover
                            sx={{
                              '&:last-child td, &:last-child th': { border: 0 },
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {/* # Index */}
                            <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>
                              {idx + 1}
                            </TableCell>

                            {/* Title & Overview */}
                            <TableCell sx={{ minWidth: 260 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                                {work.title}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  ID: #{work.id}
                                </Typography>
                                {work.notes && (
                                  <Tooltip title={work.notes}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        maxWidth: 220,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-block',
                                      }}
                                    >
                                      {work.notes}
                                    </Typography>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>

                            {/* Involvement Role */}
                            <TableCell>
                              {isLead ? (
                                <Chip
                                  label="Lead Author (Given)"
                                  color="primary"
                                  size="small"
                                  variant="filled"
                                  sx={{ fontWeight: 650, fontSize: '0.72rem', height: 24 }}
                                />
                              ) : (
                                <Chip
                                  label="Involved (Co-Author)"
                                  color="secondary"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 650, fontSize: '0.72rem', height: 24 }}
                                />
                              )}
                            </TableCell>

                            {/* Category */}
                            <TableCell>
                              <Chip
                                label={wt.label}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.72rem', height: 22 }}
                              />
                            </TableCell>

                            {/* Authors Involved */}
                            <TableCell sx={{ minWidth: 180 }}>
                              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {authors.length > 0 ? (
                                  authors.map((a, aIdx) => {
                                    const isTarget =
                                      a.toLowerCase().includes(activeCollaboratorModal.name?.toLowerCase()) ||
                                      activeCollaboratorModal.name?.toLowerCase().includes(a.toLowerCase());
                                    return (
                                      <Chip
                                        key={aIdx}
                                        label={a}
                                        size="small"
                                        color={isTarget ? 'primary' : 'default'}
                                        variant={isTarget ? 'filled' : 'outlined'}
                                        sx={{
                                          fontSize: '0.68rem',
                                          height: 20,
                                          fontWeight: isTarget ? 700 : 500,
                                        }}
                                      />
                                    );
                                  })
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    {work.client_name || 'Self'}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>

                            {/* Target Venue */}
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 550 }}>
                                {work.target_name || 'Independent / Unspecified'}
                              </Typography>
                            </TableCell>

                            {/* Target Deadline */}
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {formatHumanDate(work.commitment_date)}
                              </Typography>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Chip
                                size="small"
                                label={work.status || 'In Progress'}
                                color={
                                  String(work.status || '').toLowerCase().includes('publish') ||
                                  String(work.status || '').toLowerCase().includes('accept')
                                    ? 'success'
                                    : String(work.status || '').toLowerCase().includes('review')
                                    ? 'info'
                                    : 'primary'
                                }
                                variant="filled"
                                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                              />
                            </TableCell>

                            {/* Financial Details */}
                            <TableCell>
                              {work.paymentInfo ? (
                                <Box>
                                  <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 650, display: 'block' }}>
                                    {formatMoney(work.paymentInfo.amountDue)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color={work.paymentInfo.balance > 0 ? 'warning.main' : 'success.main'}
                                    sx={{ fontSize: '0.68rem', fontWeight: 600 }}
                                  >
                                    {work.paymentInfo.balance > 0
                                      ? `Bal: ${formatMoney(work.paymentInfo.balance)}`
                                      : 'Fully Paid'}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                  {isLead ? 'No invoice record' : 'Contributing Author'}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>

            {/* Modal Footer */}
            <DialogActions
              sx={{
                p: { xs: 2, sm: 2.5 },
                pt: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Dossier for <strong>{activeCollaboratorModal.name}</strong> •{' '}
                <strong>{filteredCollaboratorWorks.length}</strong> works shown
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={handleCloseWorksModal}
                  sx={{ borderRadius: '7px', textTransform: 'none', px: 2.5 }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportExcel}
                  sx={{
                    borderRadius: '7px',
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 2.5,
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  Download Excel (.xlsx)
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Download Toast Notification */}
      <Snackbar
        open={Boolean(downloadSuccessMsg)}
        autoHideDuration={4000}
        onClose={() => setDownloadSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDownloadSuccessMsg('')}
          severity="success"
          variant="filled"
          sx={{ width: '100%', boxShadow: 4, borderRadius: '8px' }}
        >
          {downloadSuccessMsg}
        </Alert>
      </Snackbar>
      {/* Save Collaborator Confirmation Dialog */}
      <Dialog
        open={saveClientConfirmOpen}
        onClose={() => setSaveClientConfirmOpen(false)}
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
          <PersonAddIcon color="primary" /> Save Collaborator Profile?
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to register and save this collaborator profile?
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
              {clientForm.name}
            </Typography>
            {clientForm.organization && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                Affiliation: {clientForm.organization}
              </Typography>
            )}
            {clientForm.email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Email: {clientForm.email}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            This author profile will become immediately available to link with new manuscripts, obligations, and receipts.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => setSaveClientConfirmOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSaveClient}
            color="primary"
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

