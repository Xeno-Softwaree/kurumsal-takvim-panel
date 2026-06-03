import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { loginRequest } from '../api/auth';
import { setAuthToken } from '../api/http';
import { meRequest } from '../api/auth';

type Admin = {
  id: number;
  email: string;
  is_super_admin: boolean;
};

type AuthContextValue = {
  admin: Admin | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const adminRaw = localStorage.getItem('auth_admin');
    const admin = adminRaw ? (JSON.parse(adminRaw) as Admin) : null;
    return { token, admin };
  } catch {
    return { token: null, admin: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ admin, token, loading }, setState] = useState<{
    admin: Admin | null;
    token: string | null;
    loading: boolean;
  }>({
    ...loadStoredAuth(),
    loading: false,
  });

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
    if (admin) {
      localStorage.setItem('auth_admin', JSON.stringify(admin));
    } else {
      localStorage.removeItem('auth_admin');
    }
  }, [admin, token]);

  useEffect(() => {
    let mounted = true;
    async function refreshAdmin() {
      if (!token) return;
      try {
        const me = await meRequest();
        if (!mounted) return;
        setState((s) => ({
          ...s,
          admin: {
            id: me.id,
            email: me.email,
            is_super_admin: !!me.is_super_admin,
          },
        }));
        try {
          localStorage.setItem(
            'auth_admin',
            JSON.stringify({
              id: me.id,
              email: me.email,
              is_super_admin: !!me.is_super_admin,
            }),
          );
        } catch {
          // ignore storage failures
        }
      } catch {
        // ignore refresh failures; keep existing token/admin
      }
    }
    refreshAdmin();
    return () => {
      mounted = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      token,
      loading,
      async login(email: string, password: string) {
        setState((s) => ({ ...s, loading: true }));
        try {
          const data = await loginRequest(email, password);

          setAuthToken(data.token);

          try {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_admin', JSON.stringify(data.admin));
          } catch {
            // ignore storage failures
          }

          setState({
            admin: data.admin,
            token: data.token,
            loading: false,
          });
        } catch (err) {
          setState((s) => ({ ...s, loading: false }));
          throw err;
        }
      },
      logout() {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_admin');
        } catch {
          // ignore storage failures
        }

        setAuthToken(null);
        setState({
          admin: null,
          token: null,
          loading: false,
        });
      },
    }),
    [admin, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
