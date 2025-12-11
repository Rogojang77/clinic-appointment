"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import { dashboardApi, DashboardData } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Building2,
  UserCheck,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  MapPin,
  FileText
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getOverview();
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Nu s-au putut încărca datele dashboard-ului');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    subtitle 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color?: string;
    subtitle?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      red: 'bg-red-500 text-white',
      indigo: 'bg-indigo-500 text-white'
    };

    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`p-3 rounded-md ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {value}
                </dd>
                {subtitle && (
                  <dd className="text-sm text-gray-500">
                    {subtitle}
                  </dd>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!dashboardData) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Nu s-au putut încărca datele dashboard-ului</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Încearcă din nou
          </button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panou de control</h1>
          <p className="mt-1 text-sm text-gray-500">
            Prezentare generală a sistemului de management al clinicii
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Utilizatori"
            value={dashboardData.overview.totalUsers}
            icon={Users}
            color="blue"
            subtitle={`${dashboardData.overview.activeUsers} activi`}
          />
          <StatCard
            title="Total Secțiuni"
            value={dashboardData.overview.totalSections}
            icon={Building2}
            color="green"
            subtitle={`${dashboardData.overview.activeSections} active`}
          />
          <StatCard
            title="Total Medici"
            value={dashboardData.overview.totalDoctors}
            icon={UserCheck}
            color="purple"
            subtitle={`${dashboardData.overview.activeDoctors} activi`}
          />
          <StatCard
            title="Programări Active"
            value={dashboardData.overview.activeAppointments}
            icon={Calendar}
            color="orange"
            subtitle={`${dashboardData.overview.totalAppointments} total`}
          />
        </div>

        {/* Appointment Statistics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Astăzi"
            value={dashboardData.overview.appointmentsToday}
            icon={Clock}
            color="indigo"
            subtitle="programări"
          />
          <StatCard
            title="Săptămâna aceasta"
            value={dashboardData.overview.appointmentsThisWeek}
            icon={Calendar}
            color="blue"
            subtitle="programări"
          />
          <StatCard
            title="Luna aceasta"
            value={dashboardData.overview.appointmentsThisMonth}
            icon={TrendingUp}
            color="green"
            subtitle="programări"
          />
        </div>

        {/* Role Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Distribuția rolurilor utilizatorilor
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Object.entries(dashboardData.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {role}s
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments by Location and Test Type */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Appointments by Location */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                Programări pe locație
              </h3>
              <div className="mt-5">
                <div className="space-y-3">
                  {dashboardData.appointmentsByLocation && dashboardData.appointmentsByLocation.length > 0 ? (
                    dashboardData.appointmentsByLocation.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {item.location || 'Necunoscut'}
                            </p>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {item.count}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Nu există date disponibile</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointments by Test Type */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-500" />
                Programări pe tip de test
              </h3>
              <div className="mt-5">
                <div className="space-y-3">
                  {dashboardData.appointmentsByTestType && dashboardData.appointmentsByTestType.length > 0 ? (
                    dashboardData.appointmentsByTestType.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {item.testType || 'Necunoscut'}
                            </p>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {item.count}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Nu există date disponibile</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Users */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Utilizatori recenti
              </h3>
              <div className="mt-5">
                <div className="space-y-3">
                  {dashboardData.recentActivity.users.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Programări recente
              </h3>
              <div className="mt-5">
                <div className="space-y-3">
                  {dashboardData.recentActivity.appointments && dashboardData.recentActivity.appointments.length > 0 ? (
                    dashboardData.recentActivity.appointments.slice(0, 5).map((appointment: any) => (
                      <div key={appointment._id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-orange-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {appointment.patientName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {appointment.testType} - {appointment.location}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.isConfirmed 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.isConfirmed ? 'Confirmat' : 'Neconfirmat'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Nu există programări recente</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
