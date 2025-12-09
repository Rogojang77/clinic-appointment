"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import { dashboardApi, DashboardData } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Building2,
  Calendar,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle
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
      toast.error('Failed to load dashboard data');
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
          <p className="text-gray-500">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your clinic management system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={dashboardData.overview.totalUsers}
            icon={Users}
            color="blue"
            subtitle={`${dashboardData.overview.activeUsers} active`}
          />
          <StatCard
            title="Total Sections"
            value={dashboardData.overview.totalSections}
            icon={Building2}
            color="green"
            subtitle={`${dashboardData.overview.activeSections} active`}
          />
          <StatCard
            title="Total Doctors"
            value={dashboardData.overview.totalDoctors}
            icon={UserCheck}
            color="purple"
            subtitle={`${dashboardData.overview.activeDoctors} active`}
          />
          <StatCard
            title="Activity Schedules"
            value={dashboardData.overview.totalActivitySchedules}
            icon={Calendar}
            color="orange"
            subtitle={`${dashboardData.overview.activeActivitySchedules} active`}
          />
        </div>

        {/* Role Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Role Distribution
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

        {/* Sections Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Sections Overview
            </h3>
            <div className="mt-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardData.sectionsWithUserCounts.map((section) => (
                  <div key={section._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {section.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {section.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {section.userCount}
                        </div>
                        <div className="text-xs text-gray-500">users</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        section.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {section.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                ))}
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
                Recent Users
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

          {/* Recent Schedules */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Activity Schedules
              </h3>
              <div className="mt-5">
                <div className="space-y-3">
                  {dashboardData.recentActivity.schedules.slice(0, 5).map((schedule) => (
                    <div key={schedule._id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {schedule.user?.username || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {schedule.section?.name || 'Unknown Section'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
