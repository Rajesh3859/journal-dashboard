import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout({
  children,
  activeTab,
  onSelectTab,
  mode,
  onToggleMode,
  title,
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header mode={mode} onToggleMode={onToggleMode} title={title} />
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
