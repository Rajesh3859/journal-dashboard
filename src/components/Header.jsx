import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Badge,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import RefreshIcon from '@mui/icons-material/Refresh';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import FormatSizeIcon from '@mui/icons-material/FormatSize';

const drawerWidth = 240;

export default function Header({
  mode,
  onToggleMode,
  fontScale = 1.0,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onResetFontSize,
  title = 'Research Management',
  subtitle = '',
  alertCount = 0,
  onRefresh,
  loading = false,
}) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { xs: '100%', sm: 'calc(100% - var(--app-drawer-width, 240px))' },
        ml: { xs: 0, sm: 'var(--app-drawer-width, 240px)' },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: 'width 0.15s ease-out, margin-left 0.15s ease-out',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 2, md: 2.5 }, py: 0.5 }}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, mr: 1.5 }}>
          <Typography
            variant="h6"
            component="div"
            noWrap
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              fontSize: { xs: '1.05rem', sm: '1.15rem', md: '1.25rem' },
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.3, fontSize: '0.8rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Overall App Text Size Scaler */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '7px',
              bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
              p: 0.3,
              gap: 0.2,
            }}
          >
            <Tooltip title="Decrease overall font size (A-)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={onDecreaseFontSize}
                  disabled={fontScale <= 0.8}
                  sx={{
                    p: 0.6,
                    borderRadius: '5px',
                    opacity: fontScale <= 0.8 ? 0.35 : 1,
                  }}
                >
                  <TextDecreaseIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Click to reset font size to 100%">
              <Box
                component="button"
                type="button"
                onClick={onResetFontSize}
                sx={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  px: 0.9,
                  py: 0.4,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  color: fontScale !== 1.0 ? 'primary.main' : 'text.secondary',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  },
                }}
              >
                <FormatSizeIcon sx={{ fontSize: '0.95rem' }} />
                <span>{Math.round(fontScale * 100)}%</span>
              </Box>
            </Tooltip>

            <Tooltip title="Increase overall font size (A+)">
              <span>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={onIncreaseFontSize}
                  disabled={fontScale >= 1.4}
                  sx={{
                    p: 0.6,
                    borderRadius: '5px',
                    opacity: fontScale >= 1.4 ? 0.35 : 1,
                  }}
                >
                  <TextIncreaseIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {onRefresh && (
            <Tooltip title="Synchronize records">
              <IconButton
                color="inherit"
                onClick={onRefresh}
                disabled={loading}
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px', p: 0.8 }}
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              color="inherit"
              onClick={onToggleMode}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px', p: 0.8 }}
            >
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={alertCount > 0 ? `${alertCount} urgent ${alertCount === 1 ? 'payment alert' : 'payment alerts'}` : 'No pending alerts'}>
            <IconButton
              color="inherit"
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '7px', p: 0.8 }}
            >
              <Badge badgeContent={alertCount} color="error" max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Avatar
            sx={{
              width: 36,
              height: 36,
              ml: 0.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            RM
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
