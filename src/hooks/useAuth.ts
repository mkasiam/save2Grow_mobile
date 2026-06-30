import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService } from "../services/api";
import { localStorageService } from "../utils/storage";

const normalizeUser = (value: any) => {
  if (!value) {
    return null;
  }

  return {
    ...value,
    id: value.id || value._id,
  };
};

type AuthContextValue = {
  user: any;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  register: (userData: any) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const useProvideAuth = (): AuthContextValue => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Restore any saved session on app start so navigation can choose the correct auth state.
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      setLoading(true);
      const token = await localStorageService.getItem("token");
      if (token) {
        const response = await authService.getMe();
        setUser(normalizeUser(response.data));
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (err: any) {
      setError(err.message);
      await localStorageService.removeItem("token");
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const register = useCallback(async (userData: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(userData);
      await localStorageService.setItem("token", response.data.token);
      setUser(normalizeUser(response.data.user));
      setIsLoggedIn(true);
      return {
        ...response.data,
        user: normalizeUser(response.data.user),
      };
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });

      await localStorageService.setItem("token", response.data.token);
      setUser(normalizeUser(response.data.user));
      setIsLoggedIn(true);
      return {
        ...response.data,
        user: normalizeUser(response.data.user),
      };
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await localStorageService.removeItem("token");
      setUser(null);
      setIsLoggedIn(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await localStorageService.getItem("token");
    if (!token) {
      return;
    }

    try {
      const response = await authService.getMe();
      setUser(normalizeUser(response.data));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      await localStorageService.removeItem("token");
      setUser(null);
      setIsLoggedIn(false);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      isLoggedIn,
      register,
      login,
      logout,
      refreshUser,
    }),
    [user, loading, error, isLoggedIn, register, login, logout, refreshUser],
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useProvideAuth();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
