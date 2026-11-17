import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase';

interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<string | null>;
  logoutGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => null,
  logoutGoogle: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  // ID token stored strictly in React state memory (never in localStorage)
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const token = await result.user.getIdToken();
    setIdToken(token);
    return token;
  };

  const logoutGoogle = async () => {
    await signOut(auth);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, idToken, loading, signInWithGoogle, logoutGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
