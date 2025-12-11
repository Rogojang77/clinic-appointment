import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token from localStorage
api.interceptors.request.use((config) => {
  // Get token from localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
    }
  }
  
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, the token might be expired
    if (error.response?.status === 401) {
      // Clear token from localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth_token');
          // Redirect to login if we're not already there
          if (window.location.pathname !== '/') {
            window.location.href = '/?session=expired';
          }
        } catch (err) {
          console.error('Error clearing token:', err);
        }
      }
    }
    return Promise.reject(error);
  }
);

// API Types
export interface Section {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  locationIds?: string[] | Array<{ _id: string; name: string; isActive: boolean }>;
  locationId?: string | { _id: string; name: string; isActive: boolean };
  doctors?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator';
  isAdmin: boolean;
  isverified: boolean;
  accessSection: string;
  section?: Section;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DailySchedule {
  day: string;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

export interface ActivitySchedule {
  _id: string;
  userId: string;
  sectionId: string;
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  section?: Section;
}

export interface Doctor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  sectionId: string | { _id: string; name: string; description?: string };
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  section?: Section;
}

export interface DashboardData {
  overview: {
    totalUsers: number;
    totalSections: number;
    totalActivitySchedules: number;
    totalDoctors: number;
    totalAppointments: number;
    activeUsers: number;
    activeSections: number;
    activeActivitySchedules: number;
    activeDoctors: number;
    activeAppointments: number;
    confirmedAppointments: number;
    unconfirmedAppointments: number;
    appointmentsToday: number;
    appointmentsThisWeek: number;
    appointmentsThisMonth: number;
  };
  usersByRole: Record<string, number>;
  sectionsWithSchedules: Array<{
    sectionName: string;
    scheduleCount: number;
  }>;
  sectionsWithUserCounts: Array<{
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
    userCount: number;
  }>;
  appointmentsByLocation: Array<{
    location: string;
    count: number;
  }>;
  appointmentsByTestType: Array<{
    testType: string;
    count: number;
  }>;
  recentActivity: {
    users: User[];
    schedules: ActivitySchedule[];
    appointments: any[];
  };
}

// Sections API
export const sectionsApi = {
  getAll: (options?: { activeOnly?: boolean; locationId?: string }) => {
    const params = new URLSearchParams();
    if (options?.activeOnly) params.append('activeOnly', 'true');
    if (options?.locationId && options.locationId.trim() !== '') {
      params.append('locationId', options.locationId);
    }
    const queryString = params.toString();
    const url = `/sections${queryString ? `?${queryString}` : ''}`;
    return api.get<{ success: boolean; data: Section[] }>(url);
  },
  
  getById: (id: string) => 
    api.get<{ success: boolean; data: Section }>(`/sections/${id}`),
  
  create: (data: Omit<Section, '_id' | 'createdAt' | 'updatedAt'>) => 
    api.post<{ success: boolean; data: Section }>('/sections', data),
  
  update: (id: string, data: Partial<Section>) => 
    api.put<{ success: boolean; data: Section }>(`/sections/${id}`, data),
  
  delete: (id: string) => 
    api.delete<{ success: boolean; message: string }>(`/sections/${id}`),
};

// Users API
export const usersApi = {
  getAll: (params?: { role?: string; accessSection?: string; isActive?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.accessSection) queryParams.append('accessSection', params.accessSection);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    
    return api.get<{ success: boolean; data: User[] }>(`/users?${queryParams.toString()}`);
  },
  
  getById: (id: string) => 
    api.get<{ success: boolean; data: User }>(`/users/${id}`),
  
  create: (data: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'section'>) => 
    api.post<{ success: boolean; data: User }>('/users', data),
  
  update: (id: string, data: Partial<User>) => 
    api.put<{ success: boolean; data: User }>(`/users/${id}`, data),
  
  delete: (id: string) => 
    api.delete<{ success: boolean; message: string }>(`/users/${id}`),
};

// Activity Schedules API
export const activitySchedulesApi = {
  getAll: (params?: { userId?: string; sectionId?: string; isActive?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.sectionId) queryParams.append('sectionId', params.sectionId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    
    return api.get<{ success: boolean; data: ActivitySchedule[] }>(`/activity-schedules?${queryParams.toString()}`);
  },
  
  getById: (id: string) => 
    api.get<{ success: boolean; data: ActivitySchedule }>(`/activity-schedules/${id}`),
  
  create: (data: Omit<ActivitySchedule, '_id' | 'createdAt' | 'updatedAt' | 'user' | 'section'>) => 
    api.post<{ success: boolean; data: ActivitySchedule }>('/activity-schedules', data),
  
  update: (id: string, data: Partial<ActivitySchedule>) => 
    api.put<{ success: boolean; data: ActivitySchedule }>(`/activity-schedules/${id}`, data),
  
  delete: (id: string) => 
    api.delete<{ success: boolean; message: string }>(`/activity-schedules/${id}`),
  
  getByUser: (userId: string, isActive?: boolean) => {
    const queryParams = isActive !== undefined ? `?isActive=${isActive}` : '';
    return api.get<{ success: boolean; data: ActivitySchedule[] }>(`/activity-schedules/user/${userId}${queryParams}`);
  },
  
  getBySection: (sectionId: string, isActive?: boolean) => {
    const queryParams = isActive !== undefined ? `?isActive=${isActive}` : '';
    return api.get<{ success: boolean; data: ActivitySchedule[] }>(`/activity-schedules/section/${sectionId}${queryParams}`);
  },
};

// Doctors API
export const doctorsApi = {
  getAll: (params?: { sectionId?: string; isActive?: boolean; specialization?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.sectionId) queryParams.append('sectionId', params.sectionId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.specialization) queryParams.append('specialization', params.specialization);
    
    return api.get<{ success: boolean; data: Doctor[] }>(`/doctors?${queryParams.toString()}`);
  },
  
  getById: (id: string) => 
    api.get<{ success: boolean; data: Doctor }>(`/doctors/${id}`),
  
  create: (data: Omit<Doctor, '_id' | 'createdAt' | 'updatedAt' | 'section'>) => 
    api.post<{ success: boolean; data: Doctor }>('/doctors', data),
  
  update: (id: string, data: Partial<Doctor>) => 
    api.put<{ success: boolean; data: Doctor }>(`/doctors/${id}`, data),
  
  delete: (id: string) => 
    api.delete<{ success: boolean; message: string }>(`/doctors/${id}`),
  
  getBySection: (sectionId: string, isActive?: boolean) => {
    const queryParams = isActive !== undefined ? `?isActive=${isActive}` : '';
    return api.get<{ success: boolean; data: Doctor[] }>(`/doctors/section/${sectionId}${queryParams}`);
  },
};

// Locations API
export const locationsApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Location[] }>('/locations'),
};

export interface Location {
  _id: string;
  name: string;
  isActive: boolean;
}

// Dashboard API
export const dashboardApi = {
  getOverview: () => 
    api.get<{ success: boolean; data: DashboardData }>('/dashboard'),
};

export default api;
