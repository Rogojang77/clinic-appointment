"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { usersApi, User, Section } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
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
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Nu s-au putut încărca utilizatorii');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Numele de utilizator este obligatoriu';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email-ul este obligatoriu';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email-ul este invalid';
    }

    if (!editingUser && !formData.password.trim()) {
      errors.password = 'Parola este obligatorie pentru utilizatorii noi';
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
          role: formData.role,
          isAdmin: formData.isAdmin,
          isverified: formData.isverified
        };
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await usersApi.update(editingUser._id, updateData);
        toast.success('Utilizatorul a fost actualizat cu succes');
      } else {
        // For new users, include password
        await usersApi.create(formData);
        toast.success('Utilizatorul a fost creat cu succes');
      }

      setModalOpen(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.error || 'Nu s-a putut salva utilizatorul');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      accessSection: '',
      role: user.role,
      isAdmin: user.isAdmin,
      isverified: user.isverified
    });
    setModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Ești sigur că vrei să ștergi utilizatorul "${user.username}"?`)) {
      return;
    }

    try {
      await usersApi.delete(user._id);
      toast.success('Utilizatorul a fost șters cu succes');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Nu s-a putut șterge utilizatorul');
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-150 text-red-800 mt-1">
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
      render: (value: Section) => value?.name || 'Fără secțiune'
    },
    {
      key: 'isverified',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-200 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Verificat' : 'În așteptare'}
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
            <h1 className="text-2xl font-bold text-gray-900">Utilizatori</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestionează utilizatorii sistemului și permisiunile lor
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Utilizator
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          data={users}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="Nu s-au găsit utilizatori. Creează primul utilizator pentru a începe."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingUser ? 'Editează Utilizator' : 'Adaugă Utilizator Nou'}
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
                placeholder="Introdu numele de utilizator"
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                error={formErrors.email}
                required
                placeholder="Introdu email-ul"
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
              placeholder={editingUser ? "Lasă gol pentru a păstra parola actuală" : "Introdu parola"}
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
                Anulează
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingUser ? 'Actualizează' : 'Creează'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
