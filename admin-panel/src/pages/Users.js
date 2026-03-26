import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Pagination
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { userAPI } from '../services/api';

const defaultForm = {
  username: '',
  email: '',
  phone: '',
  role: 'passenger',
  password: ''
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userAPI.getUsers({ search, role, page, limit });
      const data = response?.data?.data;
      setUsers(data?.users || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchUsers();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setPage(1);
    setTimeout(fetchUsers, 0);
  };

  const getRoleColor = (r) => {
    switch (r) {
      case 'admin': return 'error';
      case 'conductor': return 'primary';
      case 'passenger': return 'success';
      default: return 'default';
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'passenger',
      password: ''
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(defaultForm);
    setEditingUser(null);
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      if (!form.username || !form.email || !form.role) {
        setError('Username, Email and Role are required.');
        return;
      }

      if (!editingUser && !form.password) {
        setError('Password is required when creating a user.');
        return;
      }

      if (editingUser) {
        const payload = {
          username: form.username,
          email: form.email,
          phone: form.phone,
          role: form.role
        };
        if (form.password) payload.password = form.password;
        await userAPI.updateUser(editingUser.user_id, payload);
        setSuccess('User updated successfully.');
      } else {
        await userAPI.createUser(form);
        setSuccess('User created successfully.');
      }

      closeDialog();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (userId) => {
    const ok = window.confirm('Are you sure you want to delete this user?');
    if (!ok) return;

    try {
      setError('');
      setSuccess('');
      await userAPI.deleteUser(userId);
      setSuccess('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>User Management</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Filters + Add */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Search (username/email/phone)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="conductor">Conductor</MenuItem>
            <MenuItem value="passenger">Passenger</MenuItem>
          </TextField>
          <Button variant="contained" onClick={handleApplyFilters}>Apply</Button>
          <Button variant="outlined" onClick={handleResetFilters}>Reset</Button>
          <Button variant="contained" color="success" startIcon={<Add />} onClick={openCreate}>
            Add User
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>User ID</strong></TableCell>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No users found</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id} hover>
                  <TableCell>{u.user_id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip label={u.role} color={getRoleColor(u.role)} size="small" />
                  </TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => openEdit(u)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(u.user_id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              fullWidth
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="conductor">Conductor</MenuItem>
              <MenuItem value="passenger">Passenger</MenuItem>
            </TextField>
            <TextField
              label={editingUser ? 'New Password (optional)' : 'Password'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;