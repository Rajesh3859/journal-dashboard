import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  InputAdornment,
  Chip,
  Link,
  Tooltip,
  Avatar,
  Autocomplete,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LaunchIcon from '@mui/icons-material/Launch';
import EventIcon from '@mui/icons-material/Event';
import ArticleIcon from '@mui/icons-material/Article';
import GroupsIcon from '@mui/icons-material/Groups';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SendIcon from '@mui/icons-material/Send';
import SecurityIcon from '@mui/icons-material/Security';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';

import {
  getInitials,
  getAvatarColor,
  formatWorkType,
  formatHumanDate,
  formatRelativeDue,
  parseAuthorsList,
} from '../utils/humanize';

import {
  createAuthorRecord,
  normalizeAuthorDetail,
  decryptCredential,
  generateStrongPassword,
  isValidOrcid,
  formatOrcid,
  getOrcidUrl,
} from '../utils/security';
import ExcelDateRangeExport from '../components/ExcelDateRangeExport';
import { exportManuscriptsToExcel } from '../utils/excelExport';

const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 850;
const PANEL_STORAGE_KEY = 'rm_initiate_work_panel_width';

export default function ProjectsView({
  projects = [],
  clients = [],
  payments = [],
  projectForm,
  setProjectForm,
  saveProject,
  updateProjectAuthors,
  updateProject,
  updateProjectStatus,
  updateProjectCategory,
  deleteProject,
  loading,
  fontScale = 1.0,
  onSelectTab,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [authorInput, setAuthorInput] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dossierAuthorInput, setDossierAuthorInput] = useState('');

  // Resizable Right-Side Panel State & Logic
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= 1400) {
          return parsed;
        }
      }
    } catch { }
    return DEFAULT_PANEL_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startWidth: DEFAULT_PANEL_WIDTH });

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only primary/left button
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startWidth: panelWidth,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      // Moving mouse leftward (moveEvent.clientX < startX) expands right-side panel width
      const deltaX = dragStartRef.current.startX - moveEvent.clientX;
      const proposedWidth = dragStartRef.current.startWidth + deltaX;
      const maxAllowed = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, window.innerWidth - 420));
      const clampedWidth = Math.round(Math.min(Math.max(proposedWidth, MIN_PANEL_WIDTH), maxAllowed));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = (upEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = dragStartRef.current.startX - upEvent.clientX;
      const proposedWidth = dragStartRef.current.startWidth + deltaX;
      const maxAllowed = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, window.innerWidth - 420));
      const finalWidth = Math.round(Math.min(Math.max(proposedWidth, MIN_PANEL_WIDTH), maxAllowed));

      setPanelWidth(finalWidth);
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, String(finalWidth));
      } catch { }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  const handleResetWidth = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, String(DEFAULT_PANEL_WIDTH));
    } catch { }
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Row CRUD Menu and Dialog states
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    clientId: '',
    title: '',
    workType: 'journal',
    commitmentDate: '',
    targetName: '',
    targetUrl: '',
    description: '',
    status: 'In Progress',
    leadOrcid: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Confirmation dialog states
  const [saveConfirmDialogOpen, setSaveConfirmDialogOpen] = useState(false);
  const [deleteAuthorDialogOpen, setDeleteAuthorDialogOpen] = useState(false);
  const [authorToDelete, setAuthorToDelete] = useState(null);
  const [saveNewProjectConfirmOpen, setSaveNewProjectConfirmOpen] = useState(false);
  const [pendingNewProjectData, setPendingNewProjectData] = useState(null);

  // Collaborator / Lead Author credential fields (Requirement 1 & 2)
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorPassword, setCollaboratorPassword] = useState('');
  const [showCollaboratorPassword, setShowCollaboratorPassword] = useState(false);
  const [collaboratorRole, setCollaboratorRole] = useState('Lead Author / Principal Investigator');
  const [collaboratorOrcid, setCollaboratorOrcid] = useState('');
  const [collaboratorOrcidError, setCollaboratorOrcidError] = useState('');

  // Contributing Author fields (Optional & Dynamic) (Requirements 1 & 3)
  const [coAuthorName, setCoAuthorName] = useState('');
  const [coAuthorEmail, setCoAuthorEmail] = useState('');
  const [coAuthorPassword, setCoAuthorPassword] = useState('');
  const [showCoAuthorPassword, setShowCoAuthorPassword] = useState(false);
  const [coAuthorRole, setCoAuthorRole] = useState('Co-Author');
  const [coAuthorAffiliation, setCoAuthorAffiliation] = useState('');
  const [coAuthorOrcid, setCoAuthorOrcid] = useState('');
  const [coAuthorOrcidError, setCoAuthorOrcidError] = useState('');

  // Password visibility for each author card in the details view (Requirement 5)
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [visibleFormPasswords, setVisibleFormPasswords] = useState({});
  const [copiedField, setCopiedField] = useState('');

  // Pre-fill collaborator email/password/orcid when client changes
  useEffect(() => {
    if (projectForm.clientId) {
      const selectedClient = clients.find((c) => String(c.id) === String(projectForm.clientId));
      if (selectedClient) {
        if (!collaboratorEmail || clients.some((c) => c.email === collaboratorEmail)) {
          setCollaboratorEmail(selectedClient.email || '');
        }
        if (!collaboratorPassword) {
          setCollaboratorPassword(generateStrongPassword(12));
        }
        if (!collaboratorOrcid || clients.some((c) => c.orcid === collaboratorOrcid)) {
          setCollaboratorOrcid(selectedClient.orcid || '');
        }
      }
    }
  }, [projectForm.clientId, clients]);

  // CRUD Handlers for Research Manuscripts & Works
  const handleOpenRowMenu = (event, project) => {
    setRowMenuAnchor({ el: event.currentTarget, project });
  };

  const handleCloseRowMenu = () => {
    setRowMenuAnchor(null);
  };

  const handleOpenEditDialog = (project) => {
    if (!project) return;
    setEditForm({
      id: project.id,
      clientId: String(project.client_id || ''),
      title: project.title || '',
      workType: project.work_type || 'journal',
      commitmentDate: project.commitment_date || '',
      targetName: project.target_name || '',
      targetUrl: project.target_url || '',
      description: project.description || '',
      status: project.status || 'In Progress',
      leadOrcid: project.lead_orcid || '',
      authors: project.authors || [],
    });
    setEditDialogOpen(true);
    handleCloseRowMenu();
  };

  const handleRequestSaveEdit = (e) => {
    if (e) e.preventDefault();
    if (!editForm.title.trim()) return;
    setSaveConfirmDialogOpen(true);
  };

  const handleConfirmSaveEdit = async () => {
    setIsUpdating(true);
    try {
      if (updateProject) {
        await updateProject(editForm);
      }
      setSaveConfirmDialogOpen(false);
      setEditDialogOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteAuthorDialog = (author, index) => {
    setAuthorToDelete({ author, index });
    setDeleteAuthorDialogOpen(true);
  };

  const handleConfirmDeleteAuthor = async () => {
    if (!authorToDelete || !activeSelectedProject || !updateProjectAuthors) return;
    const cur = parseAuthorsList(activeSelectedProject.authors);
    const updated = cur.filter((_, i) => i !== authorToDelete.index);
    await updateProjectAuthors(activeSelectedProject.id, updated);
    setDeleteAuthorDialogOpen(false);
    setAuthorToDelete(null);
  };

  const handleRequestSaveNewProject = (e) => {
    if (e) e.preventDefault();
    if (!projectForm.clientId) {
      alert('Please select a Collaborator / Client.');
      return;
    }
    if (!projectForm.title.trim()) {
      alert('Please enter a manuscript title.');
      return;
    }

    let currentAuthors = Array.isArray(projectForm.authors) ? [...projectForm.authors] : [];

    if (coAuthorName && coAuthorName.trim()) {
      const newAuthor = createAuthorRecord({
        name: coAuthorName.trim(),
        email: coAuthorEmail.trim(),
        password: coAuthorPassword || generateStrongPassword(12),
        role: coAuthorRole || 'Co-Author',
        affiliation: coAuthorAffiliation.trim(),
        orcid: formatOrcid(coAuthorOrcid.trim()),
        isLead: false,
      });
      currentAuthors.push(newAuthor);
    }

    if (authorInput && authorInput.trim()) {
      const pending = authorInput.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      pending.forEach((p) => {
        if (!currentAuthors.some((a) => (typeof a === 'string' ? a : a.name) === p)) {
          currentAuthors.push(
            createAuthorRecord({
              name: p,
              email: `${p.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`,
              password: generateStrongPassword(12),
              role: 'Co-Author',
            })
          );
        }
      });
    }

    const matchedClient = clients.find((c) => String(c.id) === String(projectForm.clientId));
    setPendingNewProjectData({
      currentAuthors,
      clientName: matchedClient ? matchedClient.name : 'Selected Collaborator',
      collaboratorMeta: {
        email: collaboratorEmail,
        password: collaboratorPassword,
        role: collaboratorRole,
        orcid: formatOrcid(collaboratorOrcid.trim()),
      },
    });
    setSaveNewProjectConfirmOpen(true);
  };

  const handleConfirmSaveNewProject = (e) => {
    if (!pendingNewProjectData || !saveProject) return;
    setCoAuthorName('');
    setCoAuthorEmail('');
    setCoAuthorPassword('');
    setCoAuthorAffiliation('');
    setCoAuthorOrcid('');
    setCoAuthorOrcidError('');
    setAuthorInput('');
    setProjectForm((prev) => ({ ...prev, authors: pendingNewProjectData.currentAuthors }));
    saveProject(e, pendingNewProjectData.currentAuthors, pendingNewProjectData.collaboratorMeta);
    setSaveNewProjectConfirmOpen(false);
    setPendingNewProjectData(null);
  };

  const handleQuickStatusChange = async (projectId, newStatus) => {
    handleCloseRowMenu();
    if (updateProjectStatus) {
      await updateProjectStatus(projectId, newStatus);
    }
  };

  const handleQuickCategoryChange = async (projectId, newWorkType) => {
    handleCloseRowMenu();
    if (updateProjectCategory) {
      await updateProjectCategory(projectId, newWorkType);
    }
  };

  const handleOpenDeleteDialog = (project) => {
    if (!project) return;
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
    handleCloseRowMenu();
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      if (deleteProject) {
        await deleteProject(projectToDelete.id);
      }
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
      }
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text, fieldId) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(''), 2200);
  };

  const handleInviteFlow = (author, project) => {
    const inviteUrl = `https://research-portal.org/auth/setup?token=${author?.invite_token || 'inv_auth'}&email=${encodeURIComponent(author?.email || '')}&project=${encodeURIComponent(project?.title || '')}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedField(`invite-${author?.id}`);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const togglePasswordVisibility = (authorId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [authorId]: !prev[authorId],
    }));
  };

  const toggleFormPasswordVisibility = (authorId) => {
    setVisibleFormPasswords((prev) => ({
      ...prev,
      [authorId]: !prev[authorId],
    }));
  };

  // Helper to render official ORCID iD badge with distinct separation and styling
  const renderOrcidBadge = (orcidStr) => {
    if (!orcidStr) return null;
    const formatted = formatOrcid(orcidStr);
    const orcidUrl = getOrcidUrl(orcidStr);

    return (
      <Tooltip title={`Open Verified ORCID Profile: ${orcidUrl}`} enterDelay={200}>
        <Box
          component="a"
          href={orcidUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            px: 0.8,
            py: 0.3,
            borderRadius: '4px',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(166, 206, 57, 0.12)' : 'rgba(166, 206, 57, 0.08)',
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(166, 206, 57, 0.38)' : 'rgba(166, 206, 57, 0.32)',
            textDecoration: 'none',
            maxWidth: '100%',
            width: 'fit-content',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(166, 206, 57, 0.22)' : 'rgba(166, 206, 57, 0.18)',
              borderColor: '#A6CE39',
              boxShadow: '0 1px 4px rgba(166, 206, 57, 0.25)',
            },
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: '#A6CE39', // Official ORCID Green
              color: '#ffffff',
              fontSize: '8.5px',
              fontWeight: 800,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            iD
          </Box>
          <Typography
            component="span"
            sx={{
              fontSize: '0.67rem',
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}
          >
            ORCID:
          </Typography>
          <Typography
            component="span"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.71rem',
              fontWeight: 700,
              color: (theme) => (theme.palette.mode === 'dark' ? '#b5dd48' : '#3d5c06'),
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatted}
          </Typography>
          <LaunchIcon sx={{ fontSize: 11, color: '#A6CE39', ml: 0.2 }} />
        </Box>
      </Tooltip>
    );
  };

  const handleAddDynamicAuthor = () => {
    if (!coAuthorName.trim()) return;
    const newAuthor = createAuthorRecord({
      name: coAuthorName.trim(),
      email: coAuthorEmail.trim(),
      password: coAuthorPassword || generateStrongPassword(12),
      role: coAuthorRole || 'Co-Author',
      affiliation: coAuthorAffiliation.trim(),
      orcid: formatOrcid(coAuthorOrcid.trim()),
      isLead: false,
    });

    setProjectForm((prev) => ({
      ...prev,
      authors: [...(Array.isArray(prev.authors) ? prev.authors : []), newAuthor],
    }));

    setCoAuthorName('');
    setCoAuthorEmail('');
    setCoAuthorPassword('');
    setShowCoAuthorPassword(false);
    setCoAuthorAffiliation('');
    setCoAuthorOrcid('');
    setCoAuthorOrcidError('');
  };

  const handleAddAuthor = (nameToAdd) => {
    const raw = typeof nameToAdd === 'string' ? nameToAdd : authorInput;
    if (!raw) return;
    const parts = raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;

    const newRecords = parts.map((name) =>
      createAuthorRecord({
        name,
        email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`,
        password: generateStrongPassword(12),
        role: 'Co-Author',
      })
    );

    setProjectForm((prev) => {
      const current = Array.isArray(prev.authors) ? [...prev.authors] : [];
      newRecords.forEach((rec) => {
        if (!current.some((a) => (typeof a === 'string' ? a : a.name) === rec.name)) {
          current.push(rec);
        }
      });
      return {
        ...prev,
        authors: current,
      };
    });
    setAuthorInput('');
  };

  const handleRemoveAuthor = (indexToRemove) => {
    const currentAuthors = Array.isArray(projectForm.authors) ? projectForm.authors : [];
    setProjectForm((prev) => ({
      ...prev,
      authors: currentAuthors.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const filteredProjects = projects.map((p) => ({
    ...p,
    authors: parseAuthorsList(p.authors),
  })).filter((p) => {
    const q = search.toLowerCase();
    const authorsArr = p.authors;
    const matchesAuthors = authorsArr.some((a) => String(a).toLowerCase().includes(q));

    const matchesSearch =
      p.title?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      p.target_name?.toLowerCase().includes(q) ||
      matchesAuthors;
    const matchesType = typeFilter === 'all' || p.work_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeSelectedProject =
    filteredProjects.find((p) => p.id === selectedProjectId) ||
    filteredProjects[0] ||
    (typeFilter === 'all' && !search ? projects[0] : null);

  const rawSelectedProject =
    projects.find((p) => p.id === activeSelectedProject?.id) || activeSelectedProject;

  // Resolved author and collaborator details for the active selected manuscript (Requirements 5 & 6)
  const selectedAuthorDetails = useMemo(() => {
    if (!rawSelectedProject) return { leadAuthor: null, coAuthors: [], allAuthors: [] };
    const client = clients.find(
      (c) => c.id === rawSelectedProject.client_id || String(c.id) === String(rawSelectedProject.client_id)
    );

    const leadAuthor = normalizeAuthorDetail(
      {
        id: `lead_${rawSelectedProject.id}`,
        name: rawSelectedProject.client_name || client?.name || 'Lead Collaborator',
        email:
          rawSelectedProject.client_email ||
          client?.email ||
          `${(rawSelectedProject.client_name || 'author').toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`,
        role: 'Lead Author / Principal Investigator',
        affiliation: rawSelectedProject.client_organization || client?.organization || 'Principal Sponsor',
        is_lead: true,
        orcid: rawSelectedProject.lead_orcid || rawSelectedProject.client_orcid || client?.orcid || '',
      },
      0,
      true
    );

    const rawAuthors = Array.isArray(rawSelectedProject.authors) ? rawSelectedProject.authors : [];
    const coAuthors = rawAuthors.map((a, idx) => normalizeAuthorDetail(a, idx, false)).filter(Boolean);

    return {
      leadAuthor,
      coAuthors,
      allAuthors: [leadAuthor, ...coAuthors],
    };
  }, [rawSelectedProject, clients]);


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

  const columns = [
    {
      field: 'title',
      headerName: 'Manuscript / Project Title',
      flex: 1.4,
      minWidth: 190,
      renderCell: (params) => {
        const authors = parseAuthorsList(params.row.authors);
        const hasAuthors = authors.length > 0;


        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%', minWidth: 0, width: '100%' }}>
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
            <Box sx={{ overflow: 'hidden', minWidth: 0, flex: 1, py: 0.5 }}>
              <Tooltip title={params.value || ''} enterDelay={300}>
                <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.8125rem', lineHeight: 1.25 }}>
                  {params.value}
                </Typography>
              </Tooltip>
              {hasAuthors ? (
                <Tooltip title={`Co-Authors: ${authors.join(', ')}`} enterDelay={300}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                    sx={{ fontSize: '0.69rem', lineHeight: 1.25, mt: 0.2 }}
                  >
                    Co-authors: {authors.join(', ')}
                  </Typography>
                </Tooltip>
              ) : params.row.description ? (
                <Tooltip title={params.row.description} enterDelay={300}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                    sx={{ fontSize: '0.69rem', lineHeight: 1.25, mt: 0.2 }}
                  >
                    {params.row.description}
                  </Typography>
                </Tooltip>
              ) : null}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'client_name',
      headerName: 'Lead Author / Collaborator',
      flex: 1.2,
      minWidth: 175,
      renderCell: (params) => {
        const name = params.value || 'Collaborator';
        const authors = parseAuthorsList(params.row.authors);
        const hasAuthors = authors.length > 0;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0, width: '100%', py: 0.5 }}>
            <Avatar
              sx={{
                width: 26,
                height: 26,
                bgcolor: getAvatarColor(name),
                fontSize: '0.7rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(name)}
            </Avatar>
            <Box sx={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <Tooltip title={name} enterDelay={300}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}>
                  {name}
                </Typography>
              </Tooltip>
              {hasAuthors ? (
                <Tooltip title={`Co-Authors: ${authors.join(', ')}`} enterDelay={300}>
                  <Typography
                    variant="caption"
                    color="primary.main"
                    noWrap
                    sx={{
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.4,
                      fontWeight: 650,
                      mt: 0.2,
                    }}
                  >
                    <GroupsIcon sx={{ fontSize: 13 }} />
                    +{authors.length} co-author{authors.length > 1 ? 's' : ''}: {authors.join(', ')}
                  </Typography>
                </Tooltip>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ fontSize: '0.68rem', display: 'block', mt: 0.2 }}
                >
                  Lead author only
                </Typography>
              )}
            </Box>
          </Box>
        );
      },

    },
    {
      field: 'authors',
      headerName: 'Co-Authors',
      flex: 1.6,
      minWidth: 230,
      valueGetter: (_value, row) => {
        const authors = parseAuthorsList(row.authors);
        return authors.join(', ');
      },
      renderCell: (params) => {
        const authors = parseAuthorsList(params.row.authors || params.value);

        if (!authors || authors.length === 0) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                —
              </Typography>
            </Box>
          );
        }

        const fullAuthorsText = authors.join(', ');

        return (
          <Tooltip title={`Co-Authors (${authors.length}): ${fullAuthorsText}`} enterDelay={200}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                height: '100%',
                minWidth: 0,
                width: '100%',
                overflowX: 'auto',
                py: 0.5,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {authors.map((author, idx) => (
                <Chip
                  key={`${author}-${idx}`}
                  size="small"
                  avatar={
                    <Avatar
                      sx={{
                        bgcolor: getAvatarColor(author),
                        color: '#fff !important',
                        fontSize: '0.62rem !important',
                        fontWeight: 700,
                        width: '18px !important',
                        height: '18px !important',
                      }}
                    >
                      {getInitials(author)}
                    </Avatar>
                  }
                  label={author}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    height: 24,
                    borderRadius: '5px',
                    flexShrink: 0,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'action.selected' : 'action.hover',
                    '& .MuiChip-label': {
                      px: 0.7,
                    },
                  }}
                />
              ))}
            </Box>
          </Tooltip>
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
              sx={{ fontWeight: 600, fontSize: '0.7rem', height: 23, borderRadius: '6px' }}
            />
          </Box>
        );
      },
    },
    {
      field: 'target_name',
      headerName: 'Target Journal / Venue',
      flex: 1.1,
      minWidth: 160,
      renderCell: (params) => {
        const url = params.row.target_url;
        const targetText = params.value || 'Not specified';
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minWidth: 0, width: '100%' }}>
            <Tooltip title={targetText} enterDelay={300}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem', minWidth: 0 }}>
                {targetText}
              </Typography>
            </Tooltip>
            {url && (
              <Link
                href={url}
                target="_blank"
                rel="noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Editorial Portal <LaunchIcon sx={{ fontSize: 10, flexShrink: 0 }} />
              </Link>
            )}
          </Box>
        );
      },
    },
    {
      field: 'commitment_date',
      headerName: 'Target Deadline',
      width: 140,
      renderCell: (params) => {
        const relative = formatRelativeDue(params.value, 'Upcoming');
        const dateText = params.value ? formatHumanDate(params.value) : 'Flexible Timeline';
        return (
          <Tooltip title={params.value ? `${dateText} (${relative.text})` : 'Flexible Timeline (No deadline specified)'} enterDelay={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, height: '100%', minWidth: 0, width: '100%' }}>
              <EventIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.8rem' }}>
                  {dateText}
                </Typography>
                {params.value && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem', display: 'block' }}>
                    {relative.text}
                  </Typography>
                )}
              </Box>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Stage',
      width: 105,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <Chip
            size="small"
            label={params.value || 'In Progress'}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22 }}
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Tooltip title="Actions & Dropdown menu">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRowMenu(e, params.row);
                }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '6px',
                  p: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 }, flexGrow: 1, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, sm: 2.5 },
          alignItems: 'stretch',
          flexGrow: 1,
          width: '100%',
          minWidth: 0,
          position: 'relative',
        }}
      >
        {/* Form: Add Project (Initiate Research Work Right-Side Resizable Panel) */}
        <Card
          variant="outlined"
          sx={{
              borderRadius: '7px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              order: { xs: 1, lg: 2 },
              width: { xs: '100%', lg: `${panelWidth}px` },
              minWidth: { xs: '100%', lg: `${panelWidth}px` },
              maxWidth: { xs: '100%', lg: `${panelWidth}px` },
              flexShrink: 0,
              borderLeftColor: isDragging ? 'primary.main' : undefined,
              borderLeftWidth: isDragging ? 2 : 1,
              transition: isDragging ? 'none' : 'border-color 0.15s ease',
            }}
          >
            {/* Left Edge Resizer Handle */}
            <Box
              onMouseDown={handleMouseDown}
              onDoubleClick={handleResetWidth}
              sx={{
                display: { xs: 'none', lg: 'flex' },
                position: 'absolute',
                left: -11,
                top: 0,
                bottom: 0,
                width: 22,
                cursor: 'col-resize',
                zIndex: 20,
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                touchAction: 'none',
                '&:hover .resizer-bar, &:active .resizer-bar': {
                  bgcolor: 'primary.main',
                  opacity: 1,
                  width: 4,
                  boxShadow: (theme) => `0 0 8px ${theme.palette.primary.main}`,
                },
              }}
              title="Drag left/right to resize panel (Double-click to reset)"
            >
              <Box
                className="resizer-bar"
                sx={{
                  width: isDragging ? 4 : 2,
                  height: '100%',
                  maxHeight: 140,
                  borderRadius: '4px',
                  bgcolor: isDragging ? 'primary.main' : 'divider',
                  opacity: isDragging ? 1 : 0.6,
                  transition: isDragging ? 'none' : 'all 0.15s ease',
                  boxShadow: isDragging ? (theme) => `0 0 8px ${theme.palette.primary.main}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.6,
                  py: 1,
                }}
              >
                <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'background.paper' }} />
                <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'background.paper' }} />
                <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'background.paper' }} />
              </Box>
            </Box>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box>
                <Typography variant="h6" fontWeight={750}>
                  Initiate Research Work
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Track a manuscript, conference paper, or patent
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />

              <Box
                component="form"
                onSubmit={handleRequestSaveNewProject}
              >
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Collaborator / Client"
                    required
                    fullWidth
                    size="small"
                    value={projectForm.clientId}
                    onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}
                    disabled={!clients.length}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                    helperText={
                      !clients.length ? (
                        <Typography variant="caption" color="error">
                          No collaborators available.{' '}
                          <Link
                            component="button"
                            type="button"
                            onClick={() => onSelectTab('clients')}
                            sx={{ verticalAlign: 'baseline', fontWeight: 600 }}
                          >
                            Register a collaborator first
                          </Link>
                          .
                        </Typography>
                      ) : (
                        'Assign lead author or funding sponsor'
                      )
                    }
                  >
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)} sx={{ maxWidth: { xs: 320, sm: 550 }, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {c.name} {c.organization ? `(${c.organization})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Common Collaborator Details & Credentials (Requirement 1 & 2) */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '7px',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <SecurityIcon color="primary" sx={{ fontSize: 16 }} />
                        <Typography variant="caption" fontWeight={750} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                          Collaborator / Lead Author Credentials
                        </Typography>
                      </Stack>
                      <Chip size="small" label="Lead Author" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                    </Stack>

                    <TextField
                      label="Collaborator Email Address"
                      type="email"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. author@institution.edu"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      helperText="Primary email for manuscript correspondence"
                    />

                    {/* Lead Author ORCID ID Field (Requirement 1 & 7) */}
                    <TextField
                      label="Lead Author ORCID ID (Optional)"
                      size="small"
                      fullWidth
                      placeholder="e.g. 0000-0002-1825-0097"
                      value={collaboratorOrcid}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCollaboratorOrcid(val);
                        if (!isValidOrcid(val)) {
                          setCollaboratorOrcidError('Format: 0000-0002-1825-0097 or https://orcid.org/...');
                        } else {
                          setCollaboratorOrcidError('');
                        }
                      }}
                      error={Boolean(collaboratorOrcidError)}
                      helperText={collaboratorOrcidError || 'Open Researcher and Contributor ID (e.g. 0000-0002-1825-0097)'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: '#A6CE39',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 800,
                                lineHeight: 1,
                              }}
                            >
                              iD
                            </Box>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      label="Account Password"
                      type={showCollaboratorPassword ? 'text' : 'password'}
                      size="small"
                      fullWidth
                      value={collaboratorPassword}
                      onChange={(e) => setCollaboratorPassword(e.target.value)}
                      helperText="Securely hashed with SHA-256 (never stored as plain text)"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={showCollaboratorPassword ? 'Hide password' : 'Show password'}>
                              <IconButton
                                size="small"
                                onClick={() => setShowCollaboratorPassword(!showCollaboratorPassword)}
                                edge="end"
                                sx={{ mr: 0.2 }}
                              >
                                {showCollaboratorPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Generate strong password">
                              <IconButton
                                size="small"
                                onClick={() => setCollaboratorPassword(generateStrongPassword(12))}
                                edge="end"
                              >
                                <AutorenewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  {/* Contributing Authors (Optional & Dynamic) (Requirements 1 & 2) */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '7px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <GroupsIcon color="primary" sx={{ fontSize: 18 }} />
                        <Typography variant="caption" fontWeight={750} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                          Contributing Authors (Optional)
                        </Typography>
                      </Stack>
                      <Chip size="small" label="Optional" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', mt: -0.5 }}>
                      Add multiple contributing authors dynamically with their email, ORCID ID, and credentials.
                    </Typography>

                    <Stack spacing={1.2}>
                      <TextField
                        label="Author Full Name"
                        size="small"
                        fullWidth
                        placeholder="e.g. Dr. Sarah Connor"
                        value={coAuthorName}
                        onChange={(e) => setCoAuthorName(e.target.value)}
                      />

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                        <TextField
                          label="Author Email"
                          type="email"
                          size="small"
                          fullWidth
                          placeholder="author@institution.edu"
                          value={coAuthorEmail}
                          onChange={(e) => setCoAuthorEmail(e.target.value)}
                        />

                        <TextField
                          select
                          label="Author Role"
                          size="small"
                          fullWidth
                          value={coAuthorRole}
                          onChange={(e) => setCoAuthorRole(e.target.value)}
                          SelectProps={{ MenuProps: { disableScrollLock: true } }}
                          slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                        >
                          <MenuItem value="Co-Author">Co-Author</MenuItem>
                          <MenuItem value="Corresponding Author">Corresponding Author</MenuItem>
                          <MenuItem value="Contributing Researcher">Contributing Researcher</MenuItem>
                          <MenuItem value="Methodologist">Methodologist</MenuItem>
                          <MenuItem value="Data Analyst">Data Analyst</MenuItem>
                        </TextField>
                      </Box>

                      {/* Co-Author ORCID ID Field (Requirement 1 & 7) */}
                      <TextField
                        label="Author ORCID ID (Optional)"
                        size="small"
                        fullWidth
                        placeholder="e.g. 0000-0001-5109-3700"
                        value={coAuthorOrcid}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCoAuthorOrcid(val);
                          if (!isValidOrcid(val)) {
                            setCoAuthorOrcidError('Format: 0000-0001-5109-3700 or https://orcid.org/...');
                          } else {
                            setCoAuthorOrcidError('');
                          }
                        }}
                        error={Boolean(coAuthorOrcidError)}
                        helperText={coAuthorOrcidError || 'Optional ORCID digital identifier for co-author'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  bgcolor: '#A6CE39',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                iD
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Author Password"
                        type={showCoAuthorPassword ? 'text' : 'password'}
                        size="small"
                        fullWidth
                        placeholder="Leave blank to auto-generate"
                        value={coAuthorPassword}
                        onChange={(e) => setCoAuthorPassword(e.target.value)}
                        helperText="Toggle show/hide with the eye icon. Passwords are encrypted."
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title={showCoAuthorPassword ? 'Hide password' : 'Show password'}>
                                <IconButton
                                  size="small"
                                  onClick={() => setShowCoAuthorPassword(!showCoAuthorPassword)}
                                  edge="end"
                                  sx={{ mr: 0.2 }}
                                >
                                  {showCoAuthorPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Generate secure password">
                                <IconButton
                                  size="small"
                                  onClick={() => setCoAuthorPassword(generateStrongPassword(12))}
                                  edge="end"
                                >
                                  <AutorenewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Button
                        type="button"
                        variant="outlined"
                        onClick={handleAddDynamicAuthor}
                        disabled={!coAuthorName.trim()}
                        startIcon={<PersonAddIcon />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 650,
                          borderRadius: '6px',
                          height: 36,
                          fontSize: '0.8rem',
                        }}
                      >
                        Add Co-Author to Roster
                      </Button>
                    </Stack>

                    {/* Added Co-Authors Dynamic List */}
                    {Array.isArray(projectForm.authors) && projectForm.authors.length > 0 ? (
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Added Authors ({projectForm.authors.length}):
                        </Typography>
                        {projectForm.authors.map((authorItem, index) => {
                          const norm = normalizeAuthorDetail(authorItem, index, false);
                          const isVisible = Boolean(visibleFormPasswords[norm.id]);
                          const pwd = norm.password_encrypted ? decryptCredential(norm.password_encrypted) : 'Auth@2026!';

                          return (
                            <Box
                              key={norm.id || index}
                              sx={{
                                p: 1,
                                borderRadius: '6px',
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                <Avatar
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: getAvatarColor(norm.name),
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {getInitials(norm.name)}
                                </Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Stack direction="row" spacing={0.6} alignItems="center">
                                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }} noWrap>
                                      {norm.name}
                                    </Typography>
                                    <Chip size="small" label={norm.role} variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap display="block">
                                    {norm.email} &bull; {isVisible ? pwd : '••••••••'}
                                  </Typography>
                                </Box>
                              </Stack>

                              <Stack direction="row" spacing={0.3} alignItems="center">
                                <Tooltip title={isVisible ? 'Hide password' : 'Show password'}>
                                  <IconButton size="small" onClick={() => toggleFormPasswordVisibility(norm.id)} sx={{ p: 0.4 }}>
                                    {isVisible ? <VisibilityOff sx={{ fontSize: 14 }} /> : <Visibility sx={{ fontSize: 14 }} />}
                                  </IconButton>
                                </Tooltip>
                                <IconButton size="small" onClick={() => handleRemoveAuthor(index)} sx={{ p: 0.4 }} color="error">
                                  &times;
                                </IconButton>
                              </Stack>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : null}
                  </Box>

                  <TextField
                    label="Manuscript / Project Title"
                    required
                    fullWidth
                    size="small"
                    placeholder="e.g. Deep Learning Approaches in Genomic Variant Discovery"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  />

                  <TextField
                    select
                    label="Publication Category"
                    fullWidth
                    size="small"
                    value={projectForm.workType}
                    onChange={(e) => setProjectForm({ ...projectForm, workType: e.target.value })}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                  >
                    <MenuItem value="journal">Journal Article</MenuItem>
                    <MenuItem value="conference">Conference Proceeding</MenuItem>
                    <MenuItem value="patent">Patent Filing</MenuItem>
                  </TextField>

                  <TextField
                    label="Target Submission Deadline"
                    type="date"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={projectForm.commitmentDate}
                    onChange={(e) => setProjectForm({ ...projectForm, commitmentDate: e.target.value })}
                    helperText="Date agreed upon with the client"
                  />

                  <TextField
                    label="Target Journal or Conference Name"
                    fullWidth
                    size="small"
                    placeholder="e.g. Nature Machine Intelligence / IEEE Transactions"
                    value={projectForm.targetName}
                    onChange={(e) => setProjectForm({ ...projectForm, targetName: e.target.value })}
                  />

                  <TextField
                    label="Submission Portal / Reference URL"
                    type="url"
                    fullWidth
                    size="small"
                    placeholder="https://editorialmanager.com/journal"
                    value={projectForm.targetUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, targetUrl: e.target.value })}
                  />

                  <TextField
                    label="Research Abstract & Scope Notes"
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    placeholder="Summary of research methodology, deliverables, target scope..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !clients.length}
                    sx={{ mt: 'auto', height: 40, fontWeight: 750, borderRadius: '7px', textTransform: 'none', fontSize: '0.84rem' }}
                  >
                    Initiate & Save Manuscript
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* MUI X DataGrid: Research Works Directory */}
          <Card
            variant="outlined"
              sx={{
                borderRadius: '7px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                order: { xs: 2, lg: 1 },
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ md: 'center' }}
                  spacing={1.5}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MenuBookIcon color="primary" />
                      <Typography variant="h6" fontWeight={750}>
                        Research Manuscripts & Works
                      </Typography>
                      <Chip
                        size="small"
                        label={`${projects.length} ${projects.length === 1 ? 'Manuscript' : 'Manuscripts'}`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Portfolio of research manuscripts, active journal submissions, and conference papers.
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
                    <TextField
                      size="small"
                      placeholder="Search manuscripts…"
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
                        width: { xs: '100%', sm: 220 },
                        flexShrink: 0,
                        '& .MuiInputBase-root': { height: 36, borderRadius: '6px' },
                      }}
                    />

                    <TextField
                      select
                      size="small"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      SelectProps={{ MenuProps: { disableScrollLock: true } }}
                      slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                      sx={{
                        width: { xs: '100%', sm: 160 },
                        flexShrink: 0,
                        '& .MuiInputBase-root': { height: 36, borderRadius: '6px' },
                        '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
                      }}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      <MenuItem value="journal">Journals</MenuItem>
                      <MenuItem value="conference">Conferences</MenuItem>
                      <MenuItem value="patent">Patents</MenuItem>
                    </TextField>

                    <ExcelDateRangeExport
                      buttonLabel="Download Excel"
                      dialogTitle="Export Manuscripts & Works (.xlsx)"
                      items={filteredProjects}
                      dateExtractor={(p) => p.commitment_date || (p.created_at ? p.created_at.slice(0, 10) : '')}
                      onExport={({ filteredItems, startDate, endDate, presetLabel }) => {
                        return exportManuscriptsToExcel(
                          filteredItems,
                          {
                            startDate,
                            endDate,
                            presetLabel,
                            categoryFilter: typeFilter,
                            searchQuery: search,
                          },
                          payments
                        );
                      }}
                      renderSummary={(matched) => {
                        const journals = matched.filter((p) => p.work_type === 'journal').length;
                        const conferences = matched.filter((p) => p.work_type === 'conference').length;
                        const patents = matched.filter((p) => p.work_type === 'patent').length;
                        return (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.72rem' }}>
                            Includes: {journals} Journals · {conferences} Conferences · {patents} Patents
                          </Typography>
                        );
                      }}
                    />
                  </Stack>
                </Stack>

                <Box sx={{ flexGrow: 1, height: { xs: 400, sm: 460, md: 520, lg: 580, xl: 640 }, minHeight: '24rem', width: '100%' }}>
                  <DataGrid
                    rows={filteredProjects}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 5, page: 0 } },
                    }}
                    disableRowSelectionOnClick={false}
                    onRowClick={(params) => setSelectedProjectId(params.row.id)}
                    rowHeight={Math.round(58 * (fontScale || 1))}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '7px',
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
                      '& .MuiDataGrid-row.Mui-selected': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  />
                </Box>

                {activeSelectedProject ? (
                  <Card
                    variant="outlined"
                    sx={{
                      mt: 2.5,
                      borderRadius: '7px',
                      borderColor: 'divider',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.hover' : 'grey.50'),
                    }}
                  >
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ sm: 'center' }}
                        spacing={1}
                        sx={{ mb: 1.5 }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, flexShrink: 0 }}>
                            <MenuBookIcon sx={{ fontSize: 17 }} color="primary" />
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Tooltip title={activeSelectedProject.title} enterDelay={300}>
                              <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ fontSize: '0.9rem', lineHeight: 1.25 }}>
                                {activeSelectedProject.title}
                              </Typography>
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.72rem', mt: 0.2 }}>
                              {activeSelectedProject.target_name ? `Target: ${activeSelectedProject.target_name}` : `Lead Author: ${activeSelectedProject.client_name || 'Not assigned'}`}{activeSelectedProject.commitment_date ? ` • Due: ${formatHumanDate(activeSelectedProject.commitment_date)}` : ''}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.8} alignItems="center" flexShrink={0} flexWrap="wrap">
                          {/* Interactive Category Dropdown */}
                          <TextField
                            select
                            size="small"
                            value={activeSelectedProject.work_type || 'journal'}
                            onChange={(e) => updateProjectCategory && updateProjectCategory(activeSelectedProject.id, e.target.value)}
                            SelectProps={{ MenuProps: { disableScrollLock: true } }}
                            slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                            sx={{
                              width: 125,
                              '& .MuiInputBase-root': { height: 32, borderRadius: '6px' },
                              '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 650 },
                            }}
                          >
                            <MenuItem value="journal">Journal</MenuItem>
                            <MenuItem value="conference">Conference</MenuItem>
                            <MenuItem value="patent">Patent</MenuItem>
                          </TextField>

                          {/* Interactive Stage Dropdown */}
                          <TextField
                            select
                            size="small"
                            value={activeSelectedProject.status || 'In Progress'}
                            onChange={(e) => updateProjectStatus && updateProjectStatus(activeSelectedProject.id, e.target.value)}
                            SelectProps={{ MenuProps: { disableScrollLock: true } }}
                            slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                            sx={{
                              width: 130,
                              '& .MuiInputBase-root': { height: 32, borderRadius: '6px' },
                              '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 650 },
                            }}
                          >
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Under Review">Under Review</MenuItem>
                            <MenuItem value="Accepted">Accepted</MenuItem>
                            <MenuItem value="Published">Published</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </TextField>

                          {/* Edit Button */}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                            onClick={() => handleOpenEditDialog(activeSelectedProject)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 650,
                              fontSize: '0.74rem',
                              height: 32,
                              px: 1.2,
                              borderRadius: '6px',
                            }}
                          >
                            Edit
                          </Button>

                          {/* Delete Button */}
                          <Tooltip title="Delete manuscript">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(activeSelectedProject)}
                              sx={{
                                width: 32,
                                height: 32,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '6px',
                                p: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': {
                                  borderColor: 'error.main',
                                  bgcolor: 'error.lighter',
                                },
                              }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      <Divider sx={{ mb: 1.5 }} />

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
                          gap: 2,
                          alignItems: 'start',
                        }}
                      >
                        {/* Lead Author */}
                        <Box sx={{ p: 1.5, borderRadius: '6px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                            Lead Author / Collaborator
                          </Typography>
                          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: getAvatarColor(activeSelectedProject.client_name),
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(activeSelectedProject.client_name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.85rem' }}>
                                {activeSelectedProject.client_name}
                              </Typography>
                              <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.3, minWidth: 0 }}>
                                <SchoolIcon sx={{ fontSize: 13.5, color: 'text.secondary', flexShrink: 0 }} />
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                                  {selectedAuthorDetails.leadAuthor?.affiliation || activeSelectedProject.client_organization || 'Principal Sponsor / PI'}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                          {selectedAuthorDetails.leadAuthor?.orcid && (
                            <Box sx={{ mt: 1, pt: 0.8, borderTop: '1px dashed', borderColor: 'divider' }}>
                              {renderOrcidBadge(selectedAuthorDetails.leadAuthor.orcid)}
                            </Box>
                          )}
                        </Box>

                        {/* Co-Authors Roster */}
                        <Box sx={{ p: 1.5, borderRadius: '6px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                              Contributing Co-Authors
                            </Typography>
                            {activeSelectedProject.target_name && (
                              <Typography variant="caption" color="primary.main" fontWeight={650} sx={{ fontSize: '0.7rem' }}>
                                Target: {activeSelectedProject.target_name}
                              </Typography>
                            )}
                          </Stack>

                          {/* Chips list of co-authors */}
                          {parseAuthorsList(activeSelectedProject.authors).length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                              {parseAuthorsList(activeSelectedProject.authors).map((author, index) => (
                                <Chip
                                  key={`${author}-${index}`}
                                  size="small"
                                  avatar={
                                    <Avatar
                                      sx={{
                                        bgcolor: getAvatarColor(author),
                                        color: '#fff !important',
                                        fontSize: '0.65rem !important',
                                        fontWeight: 700,
                                        width: '20px !important',
                                        height: '20px !important',
                                      }}
                                    >
                                      {getInitials(author)}
                                    </Avatar>
                                  }
                                  label={`${index + 1}. ${author}`}
                                  onDelete={
                                    updateProjectAuthors
                                      ? () => handleOpenDeleteAuthorDialog(author, index)
                                      : undefined
                                  }
                                  sx={{
                                    fontWeight: 650,
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                  }}
                                  variant="outlined"
                                  color="primary"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 1, fontSize: '0.75rem' }}>
                              No co-authors added yet for this manuscript.
                            </Typography>
                          )}

                          {/* Quick-add co-author input for this selected manuscript */}
                          {updateProjectAuthors && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                              <TextField
                                size="small"
                                placeholder="Add co-authors (comma-separated)…"
                                value={dossierAuthorInput}
                                onChange={(e) => setDossierAuthorInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (dossierAuthorInput.trim()) {
                                      const parts = dossierAuthorInput.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
                                      const curRaw = Array.isArray(rawSelectedProject?.authors) ? [...rawSelectedProject.authors] : [];
                                      const updated = [...curRaw];
                                      parts.forEach((p) => {
                                        if (!updated.some((a) => (typeof a === 'string' ? a : a.name) === p)) {
                                          updated.push(
                                            createAuthorRecord({
                                              name: p,
                                              email: `${p.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`,
                                              password: generateStrongPassword(12),
                                              role: 'Co-Author',
                                            })
                                          );
                                        }
                                      });
                                      updateProjectAuthors(activeSelectedProject.id, updated);
                                      setDossierAuthorInput('');
                                    }
                                  }
                                }}
                                sx={{
                                  flex: 1,
                                  '& .MuiInputBase-root': { height: 34, borderRadius: '6px' },
                                  '& .MuiInputBase-input': { py: 0, fontSize: '0.78rem' },
                                }}
                              />
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!dossierAuthorInput.trim()}
                                onClick={() => {
                                  if (dossierAuthorInput.trim()) {
                                    const parts = dossierAuthorInput.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
                                    const curRaw = Array.isArray(rawSelectedProject?.authors) ? [...rawSelectedProject.authors] : [];
                                    const updated = [...curRaw];
                                    parts.forEach((p) => {
                                      if (!updated.some((a) => (typeof a === 'string' ? a : a.name) === p)) {
                                        updated.push(
                                          createAuthorRecord({
                                            name: p,
                                            email: `${p.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`,
                                            password: generateStrongPassword(12),
                                            role: 'Co-Author',
                                          })
                                        );
                                      }
                                    });
                                    updateProjectAuthors(activeSelectedProject.id, updated);
                                    setDossierAuthorInput('');
                                  }
                                }}
                                startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 650,
                                  fontSize: '0.75rem',
                                  height: 34,
                                  px: 1.5,
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                }}
                              >
                                Add Author
                              </Button>
                            </Stack>
                          )}
                        </Box>
                      </Box>

                      {/* Section Below: Associated Author Details & Collaborator Credentials (Requirements 5 & 6) */}
                      <Box
                        sx={{
                          mt: 2.2,
                          pt: 2,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ sm: 'center' }}
                          spacing={1}
                          sx={{ mb: 1.5 }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SecurityIcon color="primary" sx={{ fontSize: 18 }} />
                            <Typography variant="subtitle2" fontWeight={750} sx={{ fontSize: '0.86rem' }}>
                              Associated Author Credentials & Collaborator Details
                            </Typography>
                            <Chip
                              size="small"
                              label="Protected Credentials"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 650, fontSize: '0.67rem', height: 20 }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                            Portal logins, ORCID records, and corresponding affiliations
                          </Typography>
                        </Stack>

                        {/* Author Cards Grid: Displays Lead Collaborator & All Co-Authors */}
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                            gap: 1.5,
                          }}
                        >
                          {/* Lead Author Card */}
                          {selectedAuthorDetails.leadAuthor && (() => {
                            const lead = selectedAuthorDetails.leadAuthor;
                            const isVisible = Boolean(visiblePasswords[lead.id]);
                            const pwd = lead.password_encrypted
                              ? decryptCredential(lead.password_encrypted)
                              : 'Auth@Lead2026!';

                            return (
                              <Card
                                key={lead.id}
                                variant="outlined"
                                sx={{
                                  borderRadius: '7px',
                                  bgcolor: 'action.hover',
                                  border: '1px solid',
                                  borderColor: 'primary.light',
                                  p: 1.5,
                                }}
                              >
                                <Stack spacing={1}>
                                  {/* Author Header: Name & University Affiliation cleanly aligned */}
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                      <Avatar
                                        sx={{
                                          width: 36,
                                          height: 36,
                                          bgcolor: getAvatarColor(lead.name),
                                          fontSize: '0.8rem',
                                          fontWeight: 700,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {getInitials(lead.name)}
                                      </Avatar>
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.86rem', lineHeight: 1.25 }}>
                                          {lead.name}
                                        </Typography>
                                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.3, minWidth: 0 }}>
                                          <SchoolIcon sx={{ fontSize: 13.5, color: 'text.secondary', flexShrink: 0 }} />
                                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.73rem', fontWeight: 600 }}>
                                            {lead.affiliation || 'Principal Sponsor / PI'}
                                          </Typography>
                                        </Stack>
                                      </Box>
                                    </Stack>
                                    <Chip
                                      size="small"
                                      label="Lead Author / PI"
                                      color="primary"
                                      variant="filled"
                                      sx={{ fontWeight: 700, fontSize: '0.67rem', height: 22, flexShrink: 0 }}
                                    />
                                  </Stack>

                                  <Divider sx={{ my: 0.4 }} />

                                  {/* Dedicated ORCID iD Credential Row */}
                                  {lead.orcid && (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: 0.8,
                                        borderRadius: '6px',
                                        bgcolor: (theme) =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(166, 206, 57, 0.09)'
                                            : 'rgba(166, 206, 57, 0.06)',
                                        border: '1px solid',
                                        borderColor: (theme) =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(166, 206, 57, 0.32)'
                                            : 'rgba(166, 206, 57, 0.25)',
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                        <Box
                                          component="span"
                                          sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            bgcolor: '#A6CE39', // Official ORCID Green
                                            color: '#ffffff',
                                            fontSize: '9.5px',
                                            fontWeight: 800,
                                            lineHeight: 1,
                                            flexShrink: 0,
                                          }}
                                        >
                                          iD
                                        </Box>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'text.secondary',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.4,
                                            flexShrink: 0,
                                          }}
                                        >
                                          ORCID:
                                        </Typography>
                                        <Typography
                                          component="a"
                                          href={getOrcidUrl(lead.orcid)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            color: (theme) => (theme.palette.mode === 'dark' ? '#b8e348' : '#3f6305'),
                                            letterSpacing: 0.3,
                                            textDecoration: 'none',
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                              textDecoration: 'underline',
                                            },
                                          }}
                                        >
                                          {formatOrcid(lead.orcid)}
                                        </Typography>
                                      </Box>

                                      <Stack direction="row" spacing={0.3} alignItems="center" flexShrink={0}>
                                        <Tooltip title={`Open ORCID Profile: ${getOrcidUrl(lead.orcid)}`}>
                                          <IconButton
                                            size="small"
                                            component="a"
                                            href={getOrcidUrl(lead.orcid)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{
                                              p: 0.35,
                                              color: (theme) => (theme.palette.mode === 'dark' ? '#b8e348' : '#4d6d0d'),
                                              '&:hover': { bgcolor: 'rgba(166, 206, 57, 0.15)' },
                                            }}
                                          >
                                            <LaunchIcon sx={{ fontSize: 13 }} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title={copiedField === `orcid-${lead.id}` ? 'Copied!' : 'Copy ORCID iD'}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleCopy(formatOrcid(lead.orcid), `orcid-${lead.id}`)}
                                            sx={{ p: 0.35 }}
                                          >
                                            {copiedField === `orcid-${lead.id}` ? (
                                              <CheckCircleIcon sx={{ fontSize: 13 }} color="success" />
                                            ) : (
                                              <ContentCopyIcon sx={{ fontSize: 13 }} />
                                            )}
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </Box>
                                  )}

                                  {/* Email Address */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                      <EmailIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.74rem' }} noWrap>
                                        {lead.email}
                                      </Typography>
                                    </Box>
                                    <Tooltip title={copiedField === `email-${lead.id}` ? 'Copied!' : 'Copy email'}>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleCopy(lead.email, `email-${lead.id}`)}
                                        sx={{ p: 0.4 }}
                                      >
                                        {copiedField === `email-${lead.id}` ? (
                                          <CheckCircleIcon sx={{ fontSize: 14 }} color="success" />
                                        ) : (
                                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </Box>

                                  {/* Password with Show/Hide Toggle */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      p: 0.8,
                                      borderRadius: '6px',
                                      bgcolor: 'background.paper',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                      <LockIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                        Password:
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: isVisible ? 'monospace' : 'inherit',
                                          fontWeight: 700,
                                          fontSize: isVisible ? '0.78rem' : '0.9rem',
                                          letterSpacing: isVisible ? 0 : 2,
                                          color: isVisible ? 'text.primary' : 'text.secondary',
                                          minWidth: 0,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {isVisible ? pwd : '••••••••••••'}
                                      </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={0.3} alignItems="center">
                                      <Tooltip title={isVisible ? 'Hide password' : 'Show password'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => togglePasswordVisibility(lead.id)}
                                          sx={{ p: 0.4 }}
                                        >
                                          {isVisible ? <VisibilityOff sx={{ fontSize: 15 }} /> : <Visibility sx={{ fontSize: 15 }} />}
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={copiedField === `pwd-${lead.id}` ? 'Copied!' : 'Copy password'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleCopy(pwd, `pwd-${lead.id}`)}
                                          sx={{ p: 0.4 }}
                                        >
                                          {copiedField === `pwd-${lead.id}` ? (
                                            <CheckCircleIcon sx={{ fontSize: 14 }} color="success" />
                                          ) : (
                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </Box>

                                  {/* Secure Account Setup / Invitation Flow */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.4 }}>
                                    <Chip
                                      size="small"
                                      icon={<SecurityIcon sx={{ fontSize: '12px !important' }} />}
                                      label="Hashed (SHA-256)"
                                      variant="outlined"
                                      color="success"
                                      sx={{ fontSize: '0.65rem', height: 20 }}
                                    />
                                    <Tooltip title="Generates a secure account setup/onboarding link for this collaborator without exposing raw passwords.">
                                      <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<SendIcon sx={{ fontSize: 13 }} />}
                                        onClick={() => handleInviteFlow(lead, activeSelectedProject)}
                                        sx={{
                                          fontSize: '0.7rem',
                                          fontWeight: 650,
                                          textTransform: 'none',
                                          height: 24,
                                          px: 1,
                                          borderRadius: '4px',
                                        }}
                                      >
                                        {copiedField === `invite-${lead.id}` ? 'Invite Copied!' : 'Invite / Setup Flow'}
                                      </Button>
                                    </Tooltip>
                                  </Box>
                                </Stack>
                              </Card>
                            );
                          })()}

                          {/* Co-Authors Cards */}
                          {selectedAuthorDetails.coAuthors.map((author, idx) => {
                            const isVisible = Boolean(visiblePasswords[author.id]);
                            const pwd = author.password_encrypted
                              ? decryptCredential(author.password_encrypted)
                              : 'Auth@Research2026!';

                            return (
                              <Card
                                key={author.id || idx}
                                variant="outlined"
                                sx={{
                                  borderRadius: '7px',
                                  bgcolor: 'background.paper',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  p: 1.5,
                                }}
                              >
                                <Stack spacing={1}>
                                  {/* Author Header: Name & University Affiliation cleanly aligned */}
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                      <Avatar
                                        sx={{
                                          width: 36,
                                          height: 36,
                                          bgcolor: getAvatarColor(author.name),
                                          fontSize: '0.8rem',
                                          fontWeight: 700,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {getInitials(author.name)}
                                      </Avatar>
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.86rem', lineHeight: 1.25 }}>
                                          {author.name}
                                        </Typography>
                                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.3, minWidth: 0 }}>
                                          <SchoolIcon sx={{ fontSize: 13.5, color: 'text.secondary', flexShrink: 0 }} />
                                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.73rem', fontWeight: 600 }}>
                                            {author.affiliation || 'Contributing Researcher'}
                                          </Typography>
                                        </Stack>
                                      </Box>
                                    </Stack>
                                    <Chip
                                      size="small"
                                      label={author.role || 'Co-Author'}
                                      color="info"
                                      variant="outlined"
                                      sx={{ fontWeight: 650, fontSize: '0.67rem', height: 22, flexShrink: 0 }}
                                    />
                                  </Stack>

                                  <Divider sx={{ my: 0.4 }} />

                                  {/* Dedicated ORCID iD Credential Row */}
                                  {author.orcid && (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: 0.8,
                                        borderRadius: '6px',
                                        bgcolor: (theme) =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(166, 206, 57, 0.09)'
                                            : 'rgba(166, 206, 57, 0.06)',
                                        border: '1px solid',
                                        borderColor: (theme) =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(166, 206, 57, 0.32)'
                                            : 'rgba(166, 206, 57, 0.25)',
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                        <Box
                                          component="span"
                                          sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            bgcolor: '#A6CE39', // Official ORCID Green
                                            color: '#ffffff',
                                            fontSize: '9.5px',
                                            fontWeight: 800,
                                            lineHeight: 1,
                                            flexShrink: 0,
                                          }}
                                        >
                                          iD
                                        </Box>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'text.secondary',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.4,
                                            flexShrink: 0,
                                          }}
                                        >
                                          ORCID:
                                        </Typography>
                                        <Typography
                                          component="a"
                                          href={getOrcidUrl(author.orcid)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            color: (theme) => (theme.palette.mode === 'dark' ? '#b8e348' : '#3f6305'),
                                            letterSpacing: 0.3,
                                            textDecoration: 'none',
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                              textDecoration: 'underline',
                                            },
                                          }}
                                        >
                                          {formatOrcid(author.orcid)}
                                        </Typography>
                                      </Box>

                                      <Stack direction="row" spacing={0.3} alignItems="center" flexShrink={0}>
                                        <Tooltip title={`Open ORCID Profile: ${getOrcidUrl(author.orcid)}`}>
                                          <IconButton
                                            size="small"
                                            component="a"
                                            href={getOrcidUrl(author.orcid)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{
                                              p: 0.35,
                                              color: (theme) => (theme.palette.mode === 'dark' ? '#b8e348' : '#4d6d0d'),
                                              '&:hover': { bgcolor: 'rgba(166, 206, 57, 0.15)' },
                                            }}
                                          >
                                            <LaunchIcon sx={{ fontSize: 13 }} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title={copiedField === `orcid-${author.id}` ? 'Copied!' : 'Copy ORCID iD'}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleCopy(formatOrcid(author.orcid), `orcid-${author.id}`)}
                                            sx={{ p: 0.35 }}
                                          >
                                            {copiedField === `orcid-${author.id}` ? (
                                              <CheckCircleIcon sx={{ fontSize: 13 }} color="success" />
                                            ) : (
                                              <ContentCopyIcon sx={{ fontSize: 13 }} />
                                            )}
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </Box>
                                  )}

                                  {/* Email Address */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                      <EmailIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.74rem' }} noWrap>
                                        {author.email}
                                      </Typography>
                                    </Box>
                                    <Tooltip title={copiedField === `email-${author.id}` ? 'Copied!' : 'Copy email'}>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleCopy(author.email, `email-${author.id}`)}
                                        sx={{ p: 0.4 }}
                                      >
                                        {copiedField === `email-${author.id}` ? (
                                          <CheckCircleIcon sx={{ fontSize: 14 }} color="success" />
                                        ) : (
                                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </Box>

                                  {/* Password with Show/Hide Toggle */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      p: 0.8,
                                      borderRadius: '6px',
                                      bgcolor: 'action.hover',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flex: 1 }}>
                                      <LockIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                        Password:
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: isVisible ? 'monospace' : 'inherit',
                                          fontWeight: 700,
                                          fontSize: isVisible ? '0.78rem' : '0.9rem',
                                          letterSpacing: isVisible ? 0 : 2,
                                          color: isVisible ? 'text.primary' : 'text.secondary',
                                          minWidth: 0,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {isVisible ? pwd : '••••••••••••'}
                                      </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={0.3} alignItems="center">
                                      <Tooltip title={isVisible ? 'Hide password' : 'Show password'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => togglePasswordVisibility(author.id)}
                                          sx={{ p: 0.4 }}
                                        >
                                          {isVisible ? <VisibilityOff sx={{ fontSize: 15 }} /> : <Visibility sx={{ fontSize: 15 }} />}
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={copiedField === `pwd-${author.id}` ? 'Copied!' : 'Copy password'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleCopy(pwd, `pwd-${author.id}`)}
                                          sx={{ p: 0.4 }}
                                        >
                                          {copiedField === `pwd-${author.id}` ? (
                                            <CheckCircleIcon sx={{ fontSize: 14 }} color="success" />
                                          ) : (
                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </Box>

                                  {/* Secure Account Setup / Invitation Flow */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.4 }}>
                                    <Chip
                                      size="small"
                                      icon={<SecurityIcon sx={{ fontSize: '12px !important' }} />}
                                      label="Hashed (SHA-256)"
                                      variant="outlined"
                                      color="default"
                                      sx={{ fontSize: '0.65rem', height: 20 }}
                                    />
                                    <Tooltip title="Generates a secure onboarding link for the collaborator to set up personal login credentials without exposing raw passwords.">
                                      <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<SendIcon sx={{ fontSize: 13 }} />}
                                        onClick={() => handleInviteFlow(author, activeSelectedProject)}
                                        sx={{
                                          fontSize: '0.7rem',
                                          fontWeight: 650,
                                          textTransform: 'none',
                                          height: 24,
                                          px: 1,
                                          borderRadius: '4px',
                                        }}
                                      >
                                        {copiedField === `invite-${author.id}` ? 'Invite Copied!' : 'Invite / Setup Flow'}
                                      </Button>
                                    </Tooltip>
                                  </Box>
                                </Stack>
                              </Card>
                            );
                          })}

                          {/* If no co-authors exist */}
                          {selectedAuthorDetails.coAuthors.length === 0 && (
                            <Box
                              sx={{
                                p: 2.5,
                                borderRadius: '7px',
                                border: '1px dashed',
                                borderColor: 'divider',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'action.hover',
                              }}
                            >
                              <Typography variant="subtitle2" color="text.secondary" fontWeight={650} sx={{ display: 'block', mb: 0.5, fontSize: '0.82rem' }}>
                                Single-author manuscript
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', maxWidth: 450 }}>
                                You can invite or register co-authors anytime using the quick "Add Author" field above or while initiating new research works.
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    variant="outlined"
                    sx={{
                      mt: 2.5,
                      borderRadius: '7px',
                      borderColor: 'divider',
                      p: 3,
                      textAlign: 'center',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.hover' : 'grey.50'),
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      No research works found matching the selected filter ({typeFilter === 'all' ? 'All Categories' : formatWorkType(typeFilter).label}).
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1.5, textTransform: 'none', fontWeight: 650, borderRadius: '6px' }}
                      onClick={() => {
                        setTypeFilter('all');
                        setSearch('');
                      }}
                    >
                      Clear Filters & Show All Manuscripts
                    </Button>
                  </Card>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Row Actions Menu Dropdown */}
          <Menu
            anchorEl={rowMenuAnchor?.el}
            open={Boolean(rowMenuAnchor)}
            onClose={handleCloseRowMenu}
            disableScrollLock
            slotProps={{ paper: { sx: { minWidth: 210, borderRadius: '8px', boxShadow: 4 } } }}
          >
            <MenuItem onClick={() => handleOpenEditDialog(rowMenuAnchor?.project)}>
              <ListItemIcon>
                <EditIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary="Edit Manuscript" secondary="Update details & scope" />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.67rem' }}>
                CHANGE CATEGORY
              </Typography>
            </Box>
            {[
              { value: 'journal', label: 'Journal Article' },
              { value: 'conference', label: 'Conference Proceeding' },
              { value: 'patent', label: 'Patent Filing' },
            ].map((cat) => (
              <MenuItem
                key={cat.value}
                selected={rowMenuAnchor?.project?.work_type === cat.value}
                onClick={() => handleQuickCategoryChange(rowMenuAnchor?.project?.id, cat.value)}
                sx={{ py: 0.5, fontSize: '0.8rem' }}
              >
                <ListItemIcon sx={{ minWidth: 26 }}>
                  {rowMenuAnchor?.project?.work_type === cat.value ? (
                    <CheckIcon fontSize="small" color="primary" />
                  ) : null}
                </ListItemIcon>
                <ListItemText primary={cat.label} />
              </MenuItem>
            ))}

            <Divider sx={{ my: 0.5 }} />

            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.67rem' }}>
                CHANGE STAGE
              </Typography>
            </Box>
            {['In Progress', 'Under Review', 'Accepted', 'Published', 'Rejected'].map((st) => (
              <MenuItem
                key={st}
                selected={(rowMenuAnchor?.project?.status || 'In Progress') === st}
                onClick={() => handleQuickStatusChange(rowMenuAnchor?.project?.id, st)}
                sx={{ py: 0.5, fontSize: '0.8rem' }}
              >
                <ListItemIcon sx={{ minWidth: 26 }}>
                  {(rowMenuAnchor?.project?.status || 'In Progress') === st ? (
                    <CheckIcon fontSize="small" color="primary" />
                  ) : null}
                </ListItemIcon>
                <ListItemText primary={st} />
              </MenuItem>
            ))}

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => handleOpenDeleteDialog(rowMenuAnchor?.project)}
              sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.lighter' } }}
            >
              <ListItemIcon>
                <DeleteOutlineIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Delete Manuscript" />
            </MenuItem>
          </Menu>

          {/* Edit Manuscript Dialog */}
          <Dialog
            open={editDialogOpen}
            onClose={() => !isUpdating && setEditDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            disableScrollLock
            slotProps={{
              paper: {
                sx: { borderRadius: '10px' },
              },
            }}
          >
            <Box component="form" onSubmit={handleRequestSaveEdit}>
              <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon color="primary" /> Edit Research Manuscript
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
                <TextField
                  label="Collaborator / Client"
                  select
                  required
                  fullWidth
                  size="small"
                  value={editForm.clientId}
                  onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                  SelectProps={{ MenuProps: { disableScrollLock: true } }}
                  slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                >
                  {clients.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name} {c.organization ? `(${c.organization})` : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Manuscript / Project Title"
                  required
                  fullWidth
                  size="small"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    label="Publication Category"
                    fullWidth
                    size="small"
                    value={editForm.workType}
                    onChange={(e) => setEditForm({ ...editForm, workType: e.target.value })}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                  >
                    <MenuItem value="journal">Journal Article</MenuItem>
                    <MenuItem value="conference">Conference Proceeding</MenuItem>
                    <MenuItem value="patent">Patent Filing</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Manuscript Stage / Status"
                    fullWidth
                    size="small"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
                  >
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Under Review">Under Review</MenuItem>
                    <MenuItem value="Accepted">Accepted</MenuItem>
                    <MenuItem value="Published">Published</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </TextField>
                </Stack>

                <TextField
                  label="Target Submission Deadline"
                  type="date"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={editForm.commitmentDate}
                  onChange={(e) => setEditForm({ ...editForm, commitmentDate: e.target.value })}
                />

                <TextField
                  label="Target Journal or Conference Name"
                  fullWidth
                  size="small"
                  value={editForm.targetName}
                  onChange={(e) => setEditForm({ ...editForm, targetName: e.target.value })}
                />

                <TextField
                  label="Submission Portal / Reference URL"
                  type="url"
                  fullWidth
                  size="small"
                  value={editForm.targetUrl}
                  onChange={(e) => setEditForm({ ...editForm, targetUrl: e.target.value })}
                />

                <TextField
                  label="Lead Author ORCID ID"
                  fullWidth
                  size="small"
                  placeholder="0000-0002-1825-0097"
                  value={editForm.leadOrcid}
                  onChange={(e) => setEditForm({ ...editForm, leadOrcid: e.target.value })}
                />

                <TextField
                  label="Research Abstract & Scope Notes"
                  multiline
                  minRows={2.5}
                  fullWidth
                  size="small"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </DialogContent>
              <Divider />
              <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isUpdating}
                  variant="outlined"
                  sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdating || !editForm.title.trim()}
                  sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
                >
                  {isUpdating ? 'Saving Changes…' : 'Save Changes'}
                </Button>
              </DialogActions>
            </Box>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => !isDeleting && setDeleteDialogOpen(false)}
            maxWidth="xs"
            fullWidth
            disableScrollLock
            slotProps={{
              paper: {
                sx: { borderRadius: '10px' },
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <WarningAmberIcon color="error" /> Delete Research Work?
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Are you sure you want to permanently delete manuscript:
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
                <Typography variant="subtitle2" fontWeight={750} sx={{ wordBreak: 'break-word' }}>
                  {projectToDelete?.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                  Collaborator: {projectToDelete?.client_name || 'Not assigned'} &bull; {formatWorkType(projectToDelete?.work_type).label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This will permanently remove the manuscript, its linked author credential profiles, and payment obligations. This action cannot be undone.
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
              <Button
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                color="error"
                variant="contained"
                disabled={isDeleting}
                sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2, borderRadius: '6px' }}
              >
                {isDeleting ? 'Deleting Manuscript…' : 'Delete Manuscript'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Save Changes Confirmation Dialog */}
          <Dialog
            open={saveConfirmDialogOpen}
            onClose={() => !isUpdating && setSaveConfirmDialogOpen(false)}
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
              <CheckCircleIcon color="primary" /> Save Changes to Manuscript?
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Are you sure you want to save and commit your updates for this manuscript?
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
                <Typography variant="subtitle2" fontWeight={750} sx={{ wordBreak: 'break-word' }}>
                  {editForm.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Category: {formatWorkType(editForm.workType).label} &bull; Stage: {editForm.status}
                </Typography>
                {editForm.targetName && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Target: {editForm.targetName}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Your edits will be saved and updated across all project records.
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
              <Button
                onClick={() => setSaveConfirmDialogOpen(false)}
                disabled={isUpdating}
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSaveEdit}
                color="primary"
                variant="contained"
                disabled={isUpdating}
                sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
              >
                {isUpdating ? 'Saving Changes…' : 'Confirm & Save'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Co-Author Confirmation Dialog */}
          <Dialog
            open={deleteAuthorDialogOpen}
            onClose={() => setDeleteAuthorDialogOpen(false)}
            maxWidth="xs"
            fullWidth
            disableScrollLock
            slotProps={{
              paper: {
                sx: { borderRadius: '10px' },
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 750, pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <WarningAmberIcon color="error" /> Remove Co-Author?
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Are you sure you want to remove this co-author:
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
                  {typeof authorToDelete?.author === 'string'
                    ? authorToDelete.author
                    : authorToDelete?.author?.name || 'Unknown Author'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                  From manuscript: {activeSelectedProject?.title}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This author will be removed from the manuscript's contributor list.
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
              <Button
                onClick={() => setDeleteAuthorDialogOpen(false)}
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteAuthor}
                color="error"
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2, borderRadius: '6px' }}
              >
                Confirm & Remove
              </Button>
            </DialogActions>
          </Dialog>

          {/* New Manuscript Save Confirmation Dialog */}
          <Dialog
            open={saveNewProjectConfirmOpen}
            onClose={() => setSaveNewProjectConfirmOpen(false)}
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
              <CheckCircleIcon color="primary" /> Initiate & Save Manuscript?
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Are you sure you want to register and record this new manuscript?
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
                <Typography variant="subtitle2" fontWeight={750} sx={{ wordBreak: 'break-word' }}>
                  {projectForm.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Collaborator: {pendingNewProjectData?.clientName} &bull; Category: {formatWorkType(projectForm.workType).label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Co-Authors: {pendingNewProjectData?.currentAuthors?.length || 0} associated
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This will record the research work, lead author credentials, and associated author profiles in the system.
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
              <Button
                onClick={() => setSaveNewProjectConfirmOpen(false)}
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 650, height: 36, px: 2, borderRadius: '6px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSaveNewProject}
                color="primary"
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 700, height: 36, px: 2.5, borderRadius: '6px' }}
              >
                Confirm & Save
              </Button>
            </DialogActions>
          </Dialog>
      </Box>
      );
}
