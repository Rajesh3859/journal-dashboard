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
  fontScale,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onResetFontSize,
  title,
  subtitle,
  counts,
  alertCount,
  onRefresh,
  loading,
  workspace = 'research',
  onToggleWorkspace,
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header
        mode={mode}
        onToggleMode={onToggleMode}
        fontScale={fontScale}
        onIncreaseFontSize={onIncreaseFontSize}
        onDecreaseFontSize={onDecreaseFontSize}
        onResetFontSize={onResetFontSize}
        title={title}
        subtitle={subtitle}
        alertCount={alertCount}
        onRefresh={onRefresh}
        loading={loading}
        workspace={workspace}
        onToggleWorkspace={onToggleWorkspace}
      />
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        counts={counts}
        workspace={workspace}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 3.5 },
          width: { sm: 'calc(100% - var(--app-drawer-width, 240px))' },
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.15s ease-out',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, py: 0.5 }} />
        <Box sx={{ flexGrow: 1, mt: 0.5, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
