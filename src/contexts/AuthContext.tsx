import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";

// ===========================================================================
// TEMPORARY MOCK AUTH
// Firebase project access isn't available yet (login was failing with a 400
// from identitytoolkit.googleapis.com — unrelated to this app's own code).
// This mock lets people through the login screen without a real Firebase
// account so the site is usable while that gets sorted out.
//
// Known limitation: Save Preset / Watchlist / Settings persistence go
// straight to Firestore keyed by the real Firebase UID, and Firestore itself
// requires a genuine Firebase Auth token — a mock user here does not satisfy
// that, so those features will still show "Failed to save" while this mock
// is active. That's expected, not a new bug.
//
// To restore real auth: delete this whole mock block, then uncomment the
// original implementation below it.
// ===========================================================================

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function createMockUser(email: string): User {
  return {
    uid: "mock-user",
    email,
    emailVerified: true,
    isAnonymous: false,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    providerId: "password",
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "mock-token",
    getIdTokenResult: async () => ({}) as never,
    reload: async () => {},
    toJSON: () => ({}),
  } as unknown as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading] = useState(false);

  const signIn = async (email: string, _password: string) => {
    setUser(createMockUser(email));
  };

  const signUp = async (email: string, _password: string) => {
    setUser(createMockUser(email));
  };

  const logout = async () => {
    setUser(null);
  };

  const resetPassword = async (_email: string) => {
    // Mock: no email is actually sent while Firebase access is unavailable.
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ===========================================================================
// ORIGINAL FIREBASE-BACKED IMPLEMENTATION — commented out temporarily.
// Restore by deleting the mock block above and uncommenting everything below.
// ===========================================================================
/*
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
*/
