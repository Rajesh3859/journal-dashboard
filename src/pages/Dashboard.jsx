import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

const summaryStats = [
  { label: 'Total Journals', value: 18, icon: <MenuBookIcon color="primary" /> },
  { label: 'Under Review', value: 42, icon: <PendingActionsIcon color="warning" /> },
  { label: 'Accepted Papers', value: 128, icon: <CheckCircleIcon color="success" /> },
  { label: 'Active Reviewers', value: 65, icon: <PeopleAltIcon color="info" /> },
];

const columns = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'title', headerName: 'Manuscript Title', flex: 1, minWidth: 250 },
  { field: 'journal', headerName: 'Target Journal', width: 200 },
  { field: 'author', headerName: 'Lead Author', width: 160 },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => {
      const colorMap = {
        'Accepted': 'success',
        'In Review': 'warning',
        'Submitted': 'info',
        'Revision': 'secondary',
      };
      return (
        <Chip
          label={params.value}
          size="small"
          color={colorMap[params.value] || 'default'}
          variant="outlined"
        />
      );
    },
  },
  { field: 'submittedDate', headerName: 'Date', width: 130 },
];

const rows = [
  {
    id: 'MS-2026-01',
    title: 'Deep Learning Approaches in Genomic Variant Discovery',
    journal: 'Journal of Computational Biology',
    author: 'Dr. Jane Smith',
    status: 'In Review',
    submittedDate: '2026-09-15',
  },
  {
    id: 'MS-2026-02',
    title: 'Quantum Key Distribution in Urban Satellite Links',
    journal: 'Quantum Science & Tech',
    author: 'Prof. Alan Vance',
    status: 'Accepted',
    submittedDate: '2026-08-20',
  },
  {
    id: 'MS-2026-03',
    title: 'Microplastic Accumulation in Estuarine Biodiversity',
    journal: 'Environmental Ecology',
    author: 'Dr. Sarah Connor',
    status: 'Revision',
    submittedDate: '2026-09-28',
  },
  {
    id: 'MS-2026-04',
    title: 'Reinforcement Learning for Autonomous Grid Dispatching',
    journal: 'IEEE Smart Systems',
    author: 'Dr. Marcus Brody',
    status: 'Submitted',
    submittedDate: '2026-10-02',
  },
];

export default function Dashboard() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Research Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track research submissions, review workflows, and publishing progress.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2}>
        {summaryStats.map((stat) => (
          <Grid key={stat.label} item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Submissions DataGrid */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Recent Manuscript Submissions
        </Typography>
        <Box sx={{ height: 350, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10]}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Box>
  );
}
