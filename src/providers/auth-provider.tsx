'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  login as apiLogin,
  logout as apiLogout,
  getProfile,
  getToken,
  setToken,
  clearToken,
} from '@/lib/api';
import type { AuthUser } from '@/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Authenticate against the backend; resolves with the signed-in user. */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** Clear the session and redirect to /login. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // On first load, rehydrate the session from a stored token by validating it
  // against the backend. An invalid/expired token is dropped silently. All
  // state transitions happen in async callbacks so the initial 'loading' value
  // stays constant across SSR/hydration and no setState runs synchronously.
  useEffect(() => {
    let active = true;
    const token = getToken();

    Promise.resolve(token ? getProfile() : null)
      .then((profile) => {
        if (!active) return;
        if (profile) {
          setUser(profile);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: authUser } = await apiLogin(email, password);
    setToken(accessToken);
    setUser(authUser);
    setStatus('authenticated');
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
