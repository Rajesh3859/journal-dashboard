import { Box, Typography, Chip, Divider } from '@mui/material';
import DashboardView from './DashboardView';
import ClientsView from './ClientsView';
import ProjectsView from './ProjectsView';
import PaymentsView from './PaymentsView';
import HistoryView from './HistoryView';

export default function AllSectionsView(props) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', flexGrow: 1 }}>
      {/* Quick Jump Bar */}
      <Box
        sx={{
          p: 2,
          borderRadius: '7px',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          Quick Jump:
        </Typography>
        <Chip label="1. Overview" onClick={() => scrollTo('section-overview')} clickable variant="outlined" />
        <Chip label="2. Clients" onClick={() => scrollTo('section-clients')} clickable variant="outlined" />
        <Chip label="3. Projects" onClick={() => scrollTo('section-projects')} clickable variant="outlined" />
        <Chip label="4. Payments" onClick={() => scrollTo('section-payments')} clickable variant="outlined" />
        <Chip label="5. History" onClick={() => scrollTo('section-history')} clickable variant="outlined" />
      </Box>

      {/* Section 1: Overview */}
      <Box id="section-overview">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          Overview & Metrics
        </Typography>
        <DashboardView {...props} />
      </Box>

      <Divider />

      {/* Section 2: Clients */}
      <Box id="section-clients">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          Clients Management
        </Typography>
        <ClientsView {...props} />
      </Box>

      <Divider />

      {/* Section 3: Projects */}
      <Box id="section-projects">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          Research Projects
        </Typography>
        <ProjectsView {...props} />
      </Box>

      <Divider />

      {/* Section 4: Payments */}
      <Box id="section-payments">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          Payments & Follow-up
        </Typography>
        <PaymentsView {...props} />
      </Box>

      <Divider />

      {/* Section 5: History */}
      <Box id="section-history">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          Payment History & Receipts
        </Typography>
        <HistoryView {...props} />
      </Box>
    </Box>
  );
}
