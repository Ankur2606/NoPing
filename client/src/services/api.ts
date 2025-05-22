/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '../lib/firebase';
import { Message, Task, ServiceConnection, UserPreferences } from './types';

// User profile type
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferences?: UserPreferences;
}

// Message response type from API
interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

// Task response type from API
interface TasksResponse {
  tasks: Task[];
  total: number;
  hasMore: boolean;
}

// Base API URL - use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper to get the current user's auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return await user.getIdToken();
};

// Generic API request function with auth
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    // Return JSON response or empty object if no content
    return response.status === 204 ? {} : await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// API service functions for different endpoints
export const userApi = {
  getCurrentUser: () => apiRequest('/user/profile') as Promise<UserProfile>,
  updateProfile: (data: Partial<UserProfile>) => apiRequest('/user/profile', { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }) as Promise<{success: boolean, error: string | null}>,
  
  getUserPreferences: () => apiRequest('/user/preferences') as Promise<UserPreferences>,
  updateUserPreferences: (data: Partial<UserPreferences>) => apiRequest('/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(data)
  }) as Promise<{success: boolean, error: string | null}>,
};

export const messagesApi = {
  // Get messages with optional filtering
  getMessages: (params?: {
    type?: 'email' | 'slack' | 'teams' | 'all',
    read?: boolean | 'all',
    priority?: 'critical' | 'action' | 'info' | 'all',
    limit?: number,
    offset?: number
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/messages?${queryString}` : '/messages';
    
    return apiRequest(endpoint) as Promise<MessagesResponse>;
  },
  
  // Get priority messages (critical and action)
  getPriorityMessages: () => {
    return apiRequest('/messages?priority=critical,action&limit=5') as Promise<MessagesResponse>;
  },
  
  getMessage: (id: string) => apiRequest(`/messages/${id}`) as Promise<Message>,
  
  markAsRead: (id: string, read: boolean) => apiRequest(`/messages/${id}/read`, {
    method: 'PUT',
    body: JSON.stringify({ read })
  }) as Promise<{success: boolean, error: string | null}>,
  
  convertToTask: (id: string, data: {
    title?: string,
    dueDate?: string,
    priority?: 'high' | 'medium' | 'low',
    tags?: string[]
  }) => apiRequest(`/messages/${id}/convert-to-task`, {
    method: 'POST',
    body: JSON.stringify(data)
  }) as Promise<{task: Task, error: string | null}>,
};

export const tasksApi = {
  // Get tasks with optional filtering
  getTasks: (params?: {
    completed?: boolean | 'all',
    priority?: 'high' | 'medium' | 'low' | 'all',
    dueDate?: 'today' | 'tomorrow' | 'week' | 'all',
    limit?: number,
    offset?: number
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
    
    return apiRequest(endpoint) as Promise<TasksResponse>;
  },
  
  // Get tasks due today
  getTasksDueToday: () => {
    return apiRequest('/tasks?dueDate=today') as Promise<TasksResponse>;
  },
  
  getTask: (id: string) => apiRequest(`/tasks/${id}`) as Promise<Task>,
  
  createTask: (data: Omit<Task, 'id'>) => apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(data)
  }) as Promise<Task>,
  
  updateTask: (id: string, data: Partial<Task>) => apiRequest(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }) as Promise<Task>,
  
  completeTask: (id: string, completed: boolean) => apiRequest(`/tasks/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ completed })
  }) as Promise<{success: boolean, error: string | null}>,
  
  deleteTask: (id: string) => apiRequest(`/tasks/${id}`, {
    method: 'DELETE'
  }) as Promise<{success: boolean, error: string | null}>,
};

export const servicesApi = {
  getServices: () => apiRequest('/services') as Promise<{services: ServiceConnection[]}>,
  
  connectService: (type: 'email' | 'slack' | 'teams' | 'task', data: any) => 
    apiRequest(`/services/connect/${type}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }) as Promise<{success: boolean, service: ServiceConnection, error: string | null}>,
  
  disconnectService: (id: string) => apiRequest(`/services/${id}`, {
    method: 'DELETE'
  }) as Promise<{success: boolean, error: string | null}>,
  
  syncService: (id: string) => apiRequest(`/services/${id}/sync`, {
    method: 'POST'
  }) as Promise<{success: boolean, lastSynced: string, error: string | null}>,
};

// Registration data type
interface RegistrationData {
  email: string;
  password: string;
  displayName: string;
}

// Auth-specific endpoints (don't require authentication)
export const authApi = {
  register: async (email: string, password: string, displayName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Server-side profile creation after registration with Firebase Auth
  createUserProfile: async (userData: Partial<UserProfile>) => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/auth/create-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user profile');
      }
      
      return await response.json() as UserProfile;
    } catch (error) {
      console.error('Create profile error:', error);
      throw error;
    }
  }
};

// Telegram API related functions
export const telegramApi = {
  // Get status of Telegram integration
  getStatus: () => apiRequest('/telegram/link-status') as Promise<{
    isLinked: boolean;
    username?: string;
  }>,
  
  // Generate a verification code to link a Telegram account
  generateVerificationCode: () => apiRequest('/telegram/generate-code', {
    method: 'POST'
  }) as Promise<{
    verificationCode: string;
    expiresAt: string;
  }>,
  
  // Verify a code sent by the user to the Telegram bot
  verifyCode: (code: string) => apiRequest('/telegram/verify-code', {
    method: 'POST',
    body: JSON.stringify({ code })
  }) as Promise<{
    success: boolean;
    error: string | null;
  }>,
  
  // Unlink Telegram account
  unlinkAccount: () => apiRequest('/telegram/unlink', {
    method: 'POST'
  }) as Promise<{
    success: boolean;
    error: string | null;
  }>,
  
  // Send a test message to user's Telegram account
  sendTestMessage: () => apiRequest('/telegram/test-message', {
    method: 'POST'
  }) as Promise<{
    success: boolean;
    error: string | null;
  }>
};