import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, setToken, removeToken } from '@/utils/tokenStorage';

// Base API configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies (needed for refresh token)
});

// Flag to prevent multiple simultaneous refresh calls
let isRefreshing = false;
// Queue of failed requests waiting for token refresh
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add request interceptor to include auth token from localStorage
api.interceptors.request.use((config) => {
  // Skip adding token for refresh endpoint to avoid infinite loop
  if (config.url?.includes('/auth/refresh')) {
    return config;
  }

  // Get token from localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
    }
  }
  
  return config;
});

// Add response interceptor to handle token expiration and refresh
api.interceptors.response.use(
  (response) => {
    // Safety check: Log and warn if response is not JSON
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('application/json')) {
      console.warn('⚠️ Non-JSON response received:', {
        url: response.config.url,
        contentType,
        status: response.status,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    // Safety check: Log non-JSON error responses
    if (error.response) {
      const contentType = error.response.headers['content-type'];
      if (contentType && !contentType.includes('application/json')) {
        console.error('❌ Non-JSON error response:', {
          url: error.config?.url,
          contentType,
          status: error.response.status,
          statusText: error.response.statusText,
        });
      }
    }
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip refresh logic for refresh endpoint itself or login endpoint
    if (
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/login') ||
      originalRequest?.url?.includes('/register')
    ) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint (refresh token is in HttpOnly cookie)
        const response = await axios.post('/api/auth/refresh', {}, {
          withCredentials: true, // Include cookies
        });

        const { accessToken } = response.data;

        if (accessToken) {
          // Store new access token
          setToken(accessToken);

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Process queued requests
          processQueue(null, accessToken);

          // Retry the original request
          return api(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and logout
        processQueue(refreshError as AxiosError, null);
        
        if (typeof window !== 'undefined') {
          removeToken();
          
          // Redirect to login if not already there
          // Use relative path for redirect (works correctly with current origin)
          if (window.location.pathname !== '/') {
            window.location.href = '/?session=expired';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, reject normally
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
  locationIds?: string[] | Array<{ _id: string; name: string; isActive: boolean }>;
  locationId?: string | { _id: string; name: string; isActive: boolean }; // Legacy field
  sectionId: string | { _id: string; name: string; description?: string };
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  section?: Section;
}

// DTOs for API requests - frontend should only send these fields
export interface CreateDoctorDto {
  name: string;
  sectionId: string;
  locationIds: string[];
}

export interface UpdateDoctorDto extends Partial<CreateDoctorDto> {
  email?: string;
  phone?: string;
  specialization?: string;
  // Note: schedule and isActive are DB-only fields, should not be sent from frontend
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
  
  create: (data: CreateDoctorDto) => 
    api.post<{ success: boolean; data: Doctor }>('/doctors', data),
  
  update: (id: string, data: UpdateDoctorDto) => 
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
