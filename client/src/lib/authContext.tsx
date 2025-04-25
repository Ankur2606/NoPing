import { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, registerUser, loginUser, logoutUser, signInWithGoogle } from './firebase';
import { authApi, userApi, UserProfile } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  googleSignIn: () => Promise<{ success: boolean; error?: string }>;
}

// Export the context so it can be imported in the useAuth hook
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Error interface for better error handling
interface ApiError {
  message?: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from server when auth state changes
  useEffect(() => {
    const fetchUserProfile = async (user: User) => {
      try {
        const profile = await userApi.getCurrentUser();
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          await fetchUserProfile(user);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Handle user login with Firebase and server
  const login = async (email: string, password: string) => {
    try {
      const { user, error } = await loginUser(email, password);
      
      if (error) {
        return { success: false, error: error.message || 'Login failed' };
      }
      
      return { success: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Login failed' };
    }
  };

  // Handle user registration with Firebase and server
  const register = async (email: string, password: string, displayName: string) => {
    try {
      // First register with Firebase Auth
      const { user, error } = await registerUser(email, password);
      
      if (error) {
        return { success: false, error: error.message || 'Registration failed' };
      }
      
      if (user) {
        try {
          // Then create profile on the server
          await authApi.createUserProfile({
            uid: user.uid,
            email: user.email || email,
            displayName: displayName,
            photoURL: user.photoURL || undefined
          });
          
          return { success: true };
        } catch (profileError: unknown) {
          const apiError = profileError as ApiError;
          // If server profile creation fails, we should handle it
          return { success: false, error: apiError.message || 'Failed to create user profile' };
        }
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Registration failed' };
    }
  };

  // Handle Google sign-in
  const googleSignIn = async () => {
    try {
      const { user, error } = await signInWithGoogle();
      
      if (error) {
        return { success: false, error: error.message || 'Google sign-in failed' };
      }
      
      if (user) {
        try {
          // Check if this is a new user by trying to fetch their profile
          // If it fails, create a new profile
          try {
            await userApi.getCurrentUser();
          } catch (profileError) {
            // Profile doesn't exist, create it
            await authApi.createUserProfile({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || undefined
            });
          }
          
          return { success: true };
        } catch (profileError: unknown) {
          const apiError = profileError as ApiError;
          return { success: false, error: apiError.message || 'Failed to create user profile' };
        }
      }
      
      return { success: false, error: 'Google sign-in failed' };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Google sign-in failed' };
    }
  };

  // Handle user logout
  const logout = async () => {
    try {
      const { success, error } = await logoutUser();
      
      if (!success) {
        return { success: false, error: error ? error.message : 'Logout failed' };
      }
      
      return { success: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || 'Logout failed' };
    }
  };

  const value = {
    currentUser,
    userProfile,
    isLoading,
    login,
    register,
    logout,
    googleSignIn
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};