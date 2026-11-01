import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTheme } from '@mui/material/styles';
import CircleIcon from '@mui/icons-material/Circle';

const drawerWidth = 240;

const researchNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, id: 'dashboard' },
  { text: 'Collaborators', icon: <PeopleIcon />, id: 'clients', countKey: 'clients' },
  { text: 'Research Works', icon: <MenuBookIcon />, id: 'projects', countKey: 'projects' },
  {
    text: 'Invoicing & Fees',
    icon: <AccountBalanceWalletIcon />,
    id: 'payments',
    countKey: 'payments',
    alertKey: 'overdue',
  },
  { text: 'Receipts Ledger', icon: <ReceiptLongIcon />, id: 'history', countKey: 'history' },
  { text: 'Backup & Restore', icon: <SettingsBackupRestoreIcon />, id: 'backup' },
];

const tradingNavItems = [
  { text: 'Trading Overview', icon: <DashboardIcon />, id: 'trading_dashboard' },
  { text: 'Paper Purchases', icon: <ShoppingBagIcon />, id: 'trading_purchases', countKey: 'trading_purchases' },
  { text: 'Paper Sales', icon: <PointOfSaleIcon />, id: 'trading_sales', countKey: 'trading_sales' },
  {
    text: 'Payables & Receivables',
    icon: <AccountBalanceWalletIcon />,
    id: 'trading_balances',
    countKey: 'trading_balances',
    alertKey: 'trading_due',
  },
  { text: 'Profit & Financials', icon: <TrendingUpIcon />, id: 'trading_reports' },
  { text: 'Transaction History', icon: <ReceiptLongIcon />, id: 'trading_history' },
  { text: 'Backup & Restore', icon: <SettingsBackupRestoreIcon />, id: 'trading_backup' },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  counts = {},
  workspace = 'research',
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navItems = workspace === 'trading' ? tradingNavItems : researchNavItems;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 'var(--app-drawer-width, 240px)',
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: 'var(--app-drawer-width, 240px)',
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.15s ease-out',
        },
      }}
    >
      <Box>
        <Toolbar sx={{ px: 2, minHeight: 82, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '2172 / 724',
              borderRadius: '8px',
              overflow: 'hidden',
              bgcolor: '#001843',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.5)'
                : '0 2px 8px rgba(0,24,67,0.2)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,24,67,0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <Box
              component="img"
              src="/main-logo.svg"
              alt="Research Management"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </Box>
        </Toolbar>
        <Divider />

        <Box sx={{ p: 1.5 }}>
          <Box sx={{ px: 1.5, py: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: '0.75rem',
              }}
            >
              {workspace === 'trading' ? 'Trading Navigation' : 'Navigation'}
            </Typography>
          </Box>

          <List sx={{ pt: 0.5 }}>
            {navItems.map((item) => {
              const count = counts[item.countKey];
              const overdueCount = item.alertKey ? counts[item.alertKey] : 0;
              const isSelected = activeTab === item.id;

              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.6 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onSelectTab(item.id)}
                    sx={{
                      borderRadius: '7px',
                      py: 1,
                      px: 1.5,
                      transition: 'all 0.15s ease',
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        '& .MuiListItemIcon-root': {
                          color: '#FFFFFF',
                        },
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isSelected ? '#FFFFFF' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.94rem',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    />

                    {overdueCount > 0 && (
                      <Chip
                        size="small"
                        label={`${overdueCount} due`}
                        color="error"
                        sx={{
                          height: 'auto',
                          minHeight: 18,
                          py: 0.2,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          px: 0.5,
                        }}
                      />
                    )}

                    {!overdueCount && count != null && (
                      <Typography variant="caption" sx={{ color: isSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary', fontWeight: 600 }}>
                        {count}
                      </Typography>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>

      {/* Footer workspace status */}
      <Box sx={{ p: 1.5, m: 1.5, borderRadius: '7px', bgcolor: 'action.hover' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <CircleIcon sx={{ fontSize: 9, color: 'primary.main' }} />
          {workspace === 'trading' ? 'Paper Trading' : 'Research Management'}
        </Typography>
      </Box>
    </Drawer>
  );
}
