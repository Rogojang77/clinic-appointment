"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { usersApi, sectionsApi, User, Section } from '@/services/api';
import { departmentsData } from '@/lib/department';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    accessSection: '',
    role: 'operator' as 'admin' | 'operator',
    isAdmin: false,
    isverified: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
    fetchSections();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await sectionsApi.getAll();
      setSections(response.data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!editingUser && !formData.password.trim()) {
      errors.password = 'Password is required for new users';
    }

    if (!formData.accessSection) {
      errors.accessSection = 'Section is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingUser) {
        // For updates, only send fields that are provided
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          accessSection: formData.accessSection,
          role: formData.role,
          isAdmin: formData.isAdmin,
          isverified: formData.isverified
        };
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await usersApi.update(editingUser._id, updateData);
        toast.success('User updated successfully');
      } else {
        // For new users, include password
        await usersApi.create(formData);
        toast.success('User created successfully');
      }

      setModalOpen(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      accessSection: user.accessSection,
      role: user.role,
      isAdmin: user.isAdmin,
      isverified: user.isverified
    });
    setModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      await usersApi.delete(user._id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    resetForm();
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      accessSection: '',
      role: 'operator',
      isAdmin: false,
      isverified: true
    });
    setFormErrors({});
  };

  const getSectionOptions = () => {
    let sectionOptions = [];
    
    if (sections.length > 0) {
      // If sections exist, use them
      sectionOptions = sections.map(section => ({
        value: section._id,
        label: section.name
      }));
    } else {
      // If no sections exist, use departments as temporary options
      sectionOptions = departmentsData.map(dept => ({
        value: dept.name, // Use department name as value temporarily
        label: dept.name
      }));
    }
    
    // Add "All Sections" option for SuperAdmin users
    sectionOptions.unshift({
      value: "all",
      label: "All Sections"
    });
    
    return sectionOptions;
  };

  const columns = [
    {
      key: 'username',
      label: 'Username',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: string, row: User) => (
        <div className="flex flex-col">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'admin' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {value}
          </span>
          {row.isAdmin && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
              SuperAdmin
            </span>
          )}
        </div>
      )
    },
    {
      key: 'section',
      label: 'Section',
      sortable: false,
      render: (value: Section) => value?.name || 'No section'
    },
    {
      key: 'isverified',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Verified' : 'Pending'}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage system users and their permissions
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          data={users}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No users found. Create your first user to get started."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingUser ? 'Edit User' : 'Add New User'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Username"
                name="username"
                type="text"
                value={formData.username}
                onChange={(value) => setFormData({ ...formData, username: value })}
                error={formErrors.username}
                required
                placeholder="Enter username"
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                error={formErrors.email}
                required
                placeholder="Enter email"
              />
            </div>

            <FormField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              error={formErrors.password}
              required={!editingUser}
              placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
            />

            <FormField
              label="Section"
              name="accessSection"
              type="select"
              value={formData.accessSection}
              onChange={(value) => setFormData({ ...formData, accessSection: value })}
              error={formErrors.accessSection}
              required
              options={getSectionOptions()}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Role"
                name="role"
                type="select"
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'operator' })}
                options={[
                  { value: 'operator', label: 'Operator' },
                  { value: 'admin', label: 'Admin' }
                ]}
              />

              <FormField
                label="SuperAdmin"
                name="isAdmin"
                type="checkbox"
                value={formData.isAdmin}
                onChange={(value) => setFormData({ ...formData, isAdmin: value })}
              />
            </div>

            <FormField
              label="Verified"
              name="isverified"
              type="checkbox"
              value={formData.isverified}
              onChange={(value) => setFormData({ ...formData, isverified: value })}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
