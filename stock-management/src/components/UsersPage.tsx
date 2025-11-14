import { useState, useEffect } from 'react';
import { authFetch } from '../AuthContext';
import API from '../api';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'Admin' | 'Finance' | 'Reporter';
  status: 'Active' | 'Inactive';
  created_at: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'Reporter' as 'Admin' | 'Finance' | 'Reporter',
    status: 'Active' as 'Active' | 'Inactive'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await authFetch(`${API}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Prevent editing the main admin account
    if (editing && (editing.username === 'admin' || editing.id === 1)) {
      alert('Cannot edit the main admin account!');
      return;
    }
    
    try {
      if (editing) {
        const res = await authFetch(`${API}/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            name: form.name,
            email: form.email,
            role: form.role,
            status: form.status
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update user');
        }
        
        alert('User updated successfully!');
      } else {
        const res = await authFetch(`${API}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create user');
        }
        
        alert('User created successfully!');
      }
      
      resetForm();
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  }

  async function handleResetPassword(userId: number, username: string) {
    // Prevent resetting main admin password
    if (username === 'admin' || userId === 1) {
      alert('Cannot reset password for the main admin account!');
      return;
    }
    
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const res = await authFetch(`${API}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      
      alert('Password reset successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  }

  async function handleDelete(userId: number, username: string) {
    // Prevent deleting the main admin account
    if (username === 'admin' || userId === 1) {
      alert('Cannot delete the main admin account!');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    
    try {
      const res = await authFetch(`${API}/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete user');
      }
      
      alert('User deleted successfully!');
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  }

  function resetForm() {
    setForm({
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'Reporter',
      status: 'Active'
    });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(user: User) {
    // Prevent editing the main admin account
    if (user.username === 'admin' || user.id === 1) {
      alert('Cannot edit the main admin account!');
      return;
    }
    
    setForm({
      username: user.username,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setEditing(user);
    setShowForm(true);
  }

  return (
    <section className="card vstack">
      <h2>User Management</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Manage system users and their access levels
      </p>

      {!showForm && (
        <button 
          className="btn primary" 
          onClick={() => setShowForm(true)}
          style={{ alignSelf: 'flex-start', marginBottom: 20 }}
        >
          + Add New User
        </button>
      )}

      {showForm && (
        <div className="card vstack" style={{ marginBottom: 30, background: '#f9f9f9' }}>
          <h3>{editing ? 'Edit User' : 'Add New User'}</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <label>Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  placeholder="username"
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label>Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="email@example.com"
                />
              </div>
              
              {!editing && (
                <div style={{ flex: 1 }}>
                  <label>Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editing}
                    minLength={6}
                    placeholder="Min 6 characters"
                  />
                </div>
              )}
            </div>

            <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <label>Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  required
                >
                  <option value="Reporter">Reporter (View stock only)</option>
                  <option value="Finance">Finance (Full access)</option>
                  <option value="Admin">Admin (User management)</option>
                </select>
              </div>
              
              {editing && (
                <div style={{ flex: 1 }}>
                  <label>Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="hstack" style={{ gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn primary">
                {editing ? 'Update User' : 'Create User'}
              </button>
              <button type="button" className="btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isMainAdmin = user.username === 'admin' || user.id === 1;
            return (
              <tr key={user.id}>
                <td>
                  <strong>{user.username}</strong>
                  {isMainAdmin && (
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '10px', 
                      color: '#e63946',
                      fontWeight: 'bold',
                      background: '#fee',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      MAIN
                    </span>
                  )}
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: user.role === 'Admin' ? '#fee' : user.role === 'Finance' ? '#efe' : '#eef',
                    color: user.role === 'Admin' ? '#c33' : user.role === 'Finance' ? '#3c3' : '#33c'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: user.status === 'Active' ? '#efe' : '#eee',
                    color: user.status === 'Active' ? '#3c3' : '#999'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {isMainAdmin ? (
                    <span style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>
                      Protected Account
                    </span>
                  ) : (
                    <>
                      <button className="btn ghost" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button className="btn ghost" onClick={() => handleResetPassword(user.id, user.username)}>
                        Reset Password
                      </button>
                      <button className="btn danger" onClick={() => handleDelete(user.id, user.username)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
