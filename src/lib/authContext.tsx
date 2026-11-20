import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase';
import { BackendSessionUser } from '../types/sip';

const JWT_SESSION_KEY = 'sim_sip_jwt_session_v1';

interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  activeToken: string | null;
  authenticatedUser: BackendSessionUser | null;
  loading: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<BackendSessionUser>;
  signInWithGoogle: () => Promise<string | null>;
  loginWithGoogleSso: () => Promise<BackendSessionUser>;
  logoutGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  idToken: null,
  activeToken: null,
  authenticatedUser: null,
  loading: true,
  loginWithCredentials: async () => {
    throw new Error('AuthProvider not initialized');
  },
  signInWithGoogle: async () => null,
  loginWithGoogleSso: async () => {
    throw new Error('AuthProvider not initialized');
  },
  logoutGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  // Firebase ID token stored strictly in React state memory (never in localStorage)
  const [idToken, setIdToken] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(JWT_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [authenticatedUser, setAuthenticatedUser] = useState<BackendSessionUser | null>(null);
  const [firebaseInitDone, setFirebaseInitDone] = useState(false);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  // Restore JWT session from sessionStorage if present and valid
  useEffect(() => {
    let cancelled = false;

    async function verifySavedJwt() {
      let savedToken: string | null = null;
      try {
        savedToken = sessionStorage.getItem(JWT_SESSION_KEY);
      } catch {
        savedToken = null;
      }

      if (!savedToken) {
        if (!cancelled) setSessionCheckDone(true);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled && payload?.success && payload?.data) {
            setJwtToken(savedToken);
            setAuthenticatedUser(payload.data as BackendSessionUser);
            setSessionCheckDone(true);
            return;
          }
        }
      } catch {
        // Ignore network errors and clear stale token
      }

      try {
        sessionStorage.removeItem(JWT_SESSION_KEY);
      } catch {
        // ignore
      }
      if (!cancelled) {
        setJwtToken(null);
        setAuthenticatedUser(null);
        setSessionCheckDone(true);
      }
    }

    verifySavedJwt();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync Firebase Auth state & verify with backend if no JWT session is active
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          const hasJwt = (() => {
            try {
              return Boolean(sessionStorage.getItem(JWT_SESSION_KEY));
            } catch {
              return false;
            }
          })();
          if (!hasJwt) {
            const res = await fetch('/api/v1/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const payload = await res.json();
              if (payload?.success && payload?.data) {
                setAuthenticatedUser(payload.data as BackendSessionUser);
              }
            }
          }
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setFirebaseInitDone(true);
    });
    return () => unsub();
  }, []);

  const loginWithCredentials = async (
    username: string,
    password: string
  ): Promise<BackendSessionUser> => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success || !payload?.data?.token || !payload?.data?.user) {
      throw new Error(
        payload?.error || 'Gagal melakukan autentikasi. Periksa kembali username dan kata sandi.'
      );
    }

    const token = payload.data.token as string;
    const user = payload.data.user as BackendSessionUser;

    try {
      sessionStorage.setItem(JWT_SESSION_KEY, token);
    } catch {
      // ignore storage failure
    }
    setJwtToken(token);
    setAuthenticatedUser(user);
    return user;
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const token = await result.user.getIdToken();
    setIdToken(token);
    return token;
  };

  const loginWithGoogleSso = async (): Promise<BackendSessionUser> => {
    const token = await signInWithGoogle();
    if (!token) {
      throw new Error('Token autentikasi Google tidak tersedia.');
    }

    const res = await fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success || !payload?.data) {
      await signOut(auth).catch(() => {});
      setIdToken(null);
      throw new Error(
        payload?.error || 'Akun Google tidak dapat diverifikasi oleh server.'
      );
    }

    try {
      sessionStorage.removeItem(JWT_SESSION_KEY);
    } catch {
      // ignore
    }
    setJwtToken(null);
    const user = payload.data as BackendSessionUser;
    setAuthenticatedUser(user);
    return user;
  };

  const logoutGoogle = async () => {
    await signOut(auth);
    setIdToken(null);
    if (!jwtToken) {
      setAuthenticatedUser(null);
    }
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem(JWT_SESSION_KEY);
    } catch {
      // ignore
    }
    setJwtToken(null);
    setAuthenticatedUser(null);
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setIdToken(null);
  };

  const activeToken = jwtToken || idToken;
  const loading = !(firebaseInitDone && sessionCheckDone);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
        activeToken,
        authenticatedUser,
        loading,
        loginWithCredentials,
        signInWithGoogle,
        loginWithGoogleSso,
        logoutGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
