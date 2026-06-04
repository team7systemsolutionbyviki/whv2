import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getAuth
} from 'firebase/auth';
import { auth, isMockMode, firebaseConfig } from '../utils/firebase';
import { DB } from '../utils/db';

export interface UserProfile {
  uid: string;
  email: string;
  role?: 'super_admin' | 'admin' | 'staff';
}

export interface LoginHistoryRecord {
  id: string;
  timestamp: string;
  email: string;
  action: 'login' | 'logout';
  status: 'success' | 'failed';
  details?: string;
}

export const logAuthAction = (email: string, action: 'login' | 'logout', status: 'success' | 'failed', details?: string) => {
  try {
    const historyStr = localStorage.getItem('login_history') || '[]';
    const history = JSON.parse(historyStr) as LoginHistoryRecord[];
    const newRecord: LoginHistoryRecord = {
      id: 'L-' + Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      email: email || 'Unknown',
      action,
      status,
      details
    };
    history.unshift(newRecord);
    DB.setJSON('login_history', history.slice(0, 200));
  } catch (e) {
    console.error("Failed to log auth action", e);
  }
};

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isMock: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateConfig: (config: any) => void;
  resetConfig: () => void;
  createAppUser: (email: string, password: string, role: 'admin' | 'staff') => Promise<void>;
  deleteAppUser: (email: string) => Promise<void>;
  getAppUsers: () => { email: string, role: 'admin' | 'staff', uid: string }[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(isMockMode);

  useEffect(() => {
    if (!isMock && auth) {
      // Firebase auth state listener
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const email = firebaseUser.email || '';
          let role: 'super_admin' | 'admin' | 'staff' = 'staff';
          if (email.toLowerCase() === 'viki@wolsales.com' || email.toLowerCase() === 'viki') {
            role = 'super_admin';
          } else if (email.toLowerCase() === 'admin@wolsales.com') {
            role = 'admin';
          } else {
            const appUsersStr = localStorage.getItem('app_users') || '[]';
            const appUsers = JSON.parse(appUsersStr) as { email: string, role: 'admin' | 'staff' }[];
            const found = appUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (found) {
              role = found.role;
            }
          }
          setUser({
            uid: firebaseUser.uid,
            email: email,
            role: role
          });
        } else {
          // If there is a saved mock/seed user session active, preserve it
          const savedMock = localStorage.getItem('mock_user');
          if (savedMock) {
            setUser(JSON.parse(savedMock));
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Auth state changed error. Switching to Mock Mode.", error);
        setIsMock(true);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Local Mock Auth Session
      const savedUser = localStorage.getItem('mock_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === 'app_users' && user) {
        const email = user.email;
        let newRole: 'super_admin' | 'admin' | 'staff' = 'staff';
        if (email.toLowerCase() === 'viki@wolsales.com' || email.toLowerCase() === 'viki') {
          newRole = 'super_admin';
        } else if (email.toLowerCase() === 'admin@wolsales.com') {
          newRole = 'admin';
        } else {
          const appUsersStr = localStorage.getItem('app_users') || '[]';
          try {
            const appUsers = JSON.parse(appUsersStr) as { email: string, role: 'admin' | 'staff' }[];
            const found = appUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (found) {
              newRole = found.role;
            }
          } catch (err) {
            console.error("Error parsing app_users during role sync:", err);
          }
        }
        if (newRole !== user.role) {
          setUser(prev => prev ? { ...prev, role: newRole } : null);
        }
      }
    };

    window.addEventListener('local-db-update', handleDbUpdate);
    return () => {
      window.removeEventListener('local-db-update', handleDbUpdate);
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const isSeedViki = (normalizedEmail === 'viki' || normalizedEmail === 'viki@wolsales.com') && password === '1101viki';
    const isSeedAdmin = normalizedEmail === 'admin@wolsales.com' && password === 'admin123';

    // Seed admins always bypass Firebase Auth for instant local access
    if (isSeedViki || isSeedAdmin) {
      const userProfile: UserProfile = { 
        uid: isSeedViki ? 'viki-uid' : 'admin-uid', 
        email: isSeedViki ? 'viki@wolsales.com' : 'admin@wolsales.com',
        role: isSeedViki ? 'super_admin' : 'admin'
      };
      setUser(userProfile);
      localStorage.setItem('mock_user', JSON.stringify(userProfile));
      logAuthAction(userProfile.email, 'login', 'success', 'Seed profile bypass login');
      DB.createAutoBackup(userProfile.email, 'login');
      return;
    }

    if (!isMock && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        logAuthAction(normalizedEmail, 'login', 'success', 'Firebase login successful');
        DB.createAutoBackup(normalizedEmail, 'login');
      } catch (error: any) {
        logAuthAction(normalizedEmail, 'login', 'failed', error.message || 'Firebase login failed');
        throw error;
      }
    } else {
      try {
        if (!email.includes('@') || password.length < 6) {
          throw new Error("Password must be at least 6 characters and email must be valid.");
        }
        
        const appUsersStr = localStorage.getItem('app_users') || '[]';
        const appUsers = JSON.parse(appUsersStr) as { email: string, password?: string, role: 'admin' | 'staff', uid: string }[];
        
        const mockUsersStr = localStorage.getItem('mock_users') || '[]';
        const mockUsers = JSON.parse(mockUsersStr) as { email: string, password?: string, role?: 'admin' | 'staff', uid: string }[];
        
        const allMockUsers = [...appUsers, ...mockUsers];
        const existing = allMockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!existing || existing.password !== password) {
          throw new Error("Invalid username/email or password.");
        }

        const userProfile = { 
          uid: existing.uid, 
          email: existing.email, 
          role: (existing.role || 'staff') as 'super_admin' | 'admin' | 'staff' 
        };
        setUser(userProfile);
        localStorage.setItem('mock_user', JSON.stringify(userProfile));
        logAuthAction(normalizedEmail, 'login', 'success', 'Local mock login successful');
        DB.createAutoBackup(normalizedEmail, 'login');
      } catch (error: any) {
        logAuthAction(normalizedEmail, 'login', 'failed', error.message || 'Local mock login failed');
        throw error;
      }
    }
  };

  const register = async (email: string, password: string) => {
    if (!isMock && auth) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      if (!email.includes('@') || password.length < 6) {
        throw new Error("Password must be at least 6 characters and email must be valid.");
      }
      
      const mockUsersStr = localStorage.getItem('mock_users') || '[]';
      const mockUsers = JSON.parse(mockUsersStr) as { email: string, password: string, uid: string }[];
      
      const existing = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing || email.toLowerCase() === 'admin@wolsales.com') {
        throw new Error("Email address is already registered.");
      }

      const newUid = 'mock-' + Date.now();
      const newMockUser = { email, password, uid: newUid };
      mockUsers.push(newMockUser);
      localStorage.setItem('mock_users', JSON.stringify(mockUsers));

      const userProfile = { uid: newUid, email };
      setUser(userProfile);
      localStorage.setItem('mock_user', JSON.stringify(userProfile));
    }
  };

  const logout = async () => {
    const userEmail = user?.email || 'Unknown';
    await DB.createAutoBackup(userEmail, 'logout');
    // Always clear local mock/seed user first
    localStorage.removeItem('mock_user');
    setUser(null);
    logAuthAction(userEmail, 'logout', 'success', 'User clicked logout');
    if (!isMock && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Firebase signOut failed", e);
      }
    }
  };

  const updateConfig = (config: any) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    window.location.reload();
  };

  const resetConfig = () => {
    localStorage.removeItem('firebase_config');
    window.location.reload();
  };

  const createAppUser = async (email: string, password: string, role: 'admin' | 'staff') => {
    const currentUserRole = user?.role || (user?.email.toLowerCase() === 'viki@wolsales.com' ? 'super_admin' : (user?.email.toLowerCase() === 'admin@wolsales.com' ? 'admin' : 'staff'));
    
    if (role === 'admin' && currentUserRole !== 'super_admin') {
      throw new Error("Only the super admin can create admin accounts.");
    }
    if (role === 'staff' && currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
      throw new Error("Only admins or the super admin can create staff accounts.");
    }

    if (!isMock && auth && firebaseConfig) {
      try {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
      } catch (e: any) {
        console.error("Firebase secondary app user creation failed", e);
        throw new Error(e.message || "Failed to create user on Firebase.");
      }
    }

    const appUsersStr = localStorage.getItem('app_users') || '[]';
    const appUsers = JSON.parse(appUsersStr) as { email: string, password?: string, role: 'admin' | 'staff', uid: string }[];
    
    if (appUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("User already exists.");
    }

    appUsers.push({
      email: email.toLowerCase(),
      password: password,
      role: role,
      uid: 'user-' + Date.now()
    });
    DB.setJSON('app_users', appUsers);
  };

  const deleteAppUser = async (email: string) => {
    const appUsersStr = localStorage.getItem('app_users') || '[]';
    const appUsers = JSON.parse(appUsersStr) as { email: string, password?: string, role: 'admin' | 'staff', uid: string }[];
    const filtered = appUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    DB.setJSON('app_users', filtered);
  };

  const getAppUsers = () => {
    const appUsersStr = localStorage.getItem('app_users') || '[]';
    return JSON.parse(appUsersStr) as { email: string, role: 'admin' | 'staff', uid: string }[];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isMock, 
      login, 
      register, 
      logout, 
      updateConfig, 
      resetConfig,
      createAppUser,
      deleteAppUser,
      getAppUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
