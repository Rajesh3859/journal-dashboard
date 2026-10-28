import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Divider,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { getDateRangePresets, filterByDateRange } from '../utils/humanize';

/**
 * ExcelDateRangeExport
 * Reusable dropdown button + popover enabling date range filtering and structured Excel downloads.
 *
 * @param {string} buttonLabel - Text shown on the main trigger button (default: 'Export Excel')
 * @param {string} dialogTitle - Header title in the popover (default: 'Export to Excel (.xlsx)')
 * @param {Array} items - Source items array to filter and export
 * @param {Function} dateExtractor - Callback function returning date string (e.g. YYYY-MM-DD) for each item
 * @param {Function} onExport - Callback receiving { filteredItems, startDate, endDate, presetLabel } to run the export
 * @param {Function} renderSummary - Optional custom render function for extra summary metrics inside popover
 * @param {string} buttonVariant - 'contained' | 'outlined' (default: 'outlined')
 * @param {string} buttonColor - 'success' | 'primary' | etc. (default: 'success')
 * @param {Object} buttonSx - Extra sx styling for trigger button
 */
export default function ExcelDateRangeExport({
  buttonLabel = 'Export Excel',
  dialogTitle = 'Export to Excel (.xlsx)',
  items = [],
  dateExtractor,
  onExport,
  renderSummary,
  buttonVariant = 'contained',
  buttonColor = 'success',
  buttonSx = {},
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const presets = useMemo(() => getDateRangePresets(), []);

  const open = Boolean(anchorEl);
  const id = open ? 'excel-export-popover' : undefined;

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePresetChange = (newPresetKey) => {
    setPreset(newPresetKey);
    const found = presets.find((p) => p.key === newPresetKey);
    if (found && newPresetKey !== 'custom') {
      setStartDate(found.startDate);
      setEndDate(found.endDate);
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    setPreset('custom');
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    setPreset('custom');
  };

  const handleReset = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Filter items based on current active date bounds
  const filteredItems = useMemo(() => {
    return filterByDateRange(items, dateExtractor, startDate, endDate);
  }, [items, dateExtractor, startDate, endDate]);

  const isInvalidRange = startDate && endDate && startDate > endDate;

  const currentPresetObj = presets.find((p) => p.key === preset);
  const presetLabel = currentPresetObj
    ? currentPresetObj.label
    : (startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Date Range');

  const handleDownload = () => {
    if (isInvalidRange) return;
    try {
      if (typeof onExport === 'function') {
        const generatedFileName = onExport({
          filteredItems,
          startDate,
          endDate,
          presetLabel,
        });
        const count = filteredItems.length;
        setSnackbarMsg(`Downloaded: ${generatedFileName || 'Excel spreadsheet'} (${count} ${count === 1 ? 'record' : 'records'})`);
      }
      handleClose();
    } catch (err) {
      console.error('Export failed:', err);
      setSnackbarMsg('Failed to download Excel file. Please try again.');
    }
  };

  return (
    <>
      <Button
        aria-describedby={id}
        variant={buttonVariant}
        color={buttonColor}
        size="small"
        startIcon={<FileDownloadIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleOpen}
        sx={{
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '7px',
          px: 1.6,
          height: 36,
          boxShadow: buttonVariant === 'contained' ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
          whiteSpace: 'nowrap',
          ...buttonSx,
        }}
      >
        {buttonLabel}
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 6,
          sx: {
            p: 2.2,
            width: { xs: 320, sm: 380 },
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            mt: 0.8,
          },
        }}
      >
        <Stack spacing={2}>
          {/* Header */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <DateRangeIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={750}>
                {dialogTitle}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Select a custom date range or quick preset to export formatted data.
            </Typography>
          </Box>

          <Divider />

          {/* Preset Selector Dropdown */}
          <FormControl size="small" fullWidth>
            <InputLabel id="export-preset-select-label">Duration Period</InputLabel>
            <Select
              labelId="export-preset-select-label"
              value={preset}
              label="Duration Period"
              onChange={(e) => handlePresetChange(e.target.value)}
              sx={{ borderRadius: '7px', fontSize: '0.85rem' }}
            >
              {presets.map((p) => (
                <MenuItem key={p.key} value={p.key} sx={{ fontSize: '0.85rem' }}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date Range Inputs */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, sx: { fontSize: '0.85rem' } },
                htmlInput: { sx: { fontSize: '0.82rem' } },
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, sx: { fontSize: '0.85rem' } },
                htmlInput: { sx: { fontSize: '0.82rem' } },
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          {isInvalidRange && (
            <Alert severity="error" sx={{ py: 0.5, fontSize: '0.75rem' }}>
              From Date cannot be later than To Date.
            </Alert>
          )}

          {/* Humanised Preview & KPI Box */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'action.hover',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                EXPORT PREVIEW
              </Typography>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                label={`${filteredItems.length} matching`}
                size="small"
                color={filteredItems.length > 0 ? 'success' : 'default'}
                variant="outlined"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
              {filteredItems.length > 0 ? (
                <>
                  Exporting <strong>{filteredItems.length}</strong> of{' '}
                  <strong>{items.length}</strong> total records with structured headers and calculations.
                </>
              ) : (
                <span style={{ color: '#d32f2f' }}>
                  No records found within the selected date boundary.
                </span>
              )}
            </Typography>

            {/* Custom summary metric if provided by parent */}
            {typeof renderSummary === 'function' && renderSummary(filteredItems)}
          </Paper>

          {/* Actions */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ pt: 0.5 }}>
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
              onClick={handleReset}
              sx={{ fontSize: '0.78rem', textTransform: 'none', color: 'text.secondary' }}
            >
              Reset to All
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClose}
                sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.8rem' }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<FileDownloadIcon />}
                disabled={filteredItems.length === 0 || isInvalidRange}
                onClick={handleDownload}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                }}
              >
                Download (.xlsx)
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Popover>

      {/* Floating feedback toast */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg('')}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
