import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: Address | null;
  role: "customer" | "admin";
}

interface SignUpResult {
  error: string | null;
  needsConfirmation: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** True until the initial session check completes */
  loading: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateProfile: (fields: {
    full_name?: string;
    phone?: string;
    address?: Address;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// "Remember me": Supabase persists sessions in localStorage. When the user
// opts out we mark the session as ephemeral and end it on the next visit
// that isn't part of the same browser tab.
const EPHEMERAL_KEY = "anita-session-ephemeral";
const TAB_KEY = "anita-session-tab";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ephemeral = localStorage.getItem(EPHEMERAL_KEY) === "1";
    const sameTab = sessionStorage.getItem(TAB_KEY) === "1";
    const init = async () => {
      if (ephemeral && !sameTab) {
        // scope: "local" — this only ends the not-remembered session as seen
        // from this new tab. Global scope would also kill the original tab's
        // still-active session, which the user never asked to end.
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem(EPHEMERAL_KEY);
      }
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) sessionStorage.setItem(TAB_KEY, "1");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const FALLBACK: Profile = {
      full_name: null,
      phone: null,
      avatar_url: null,
      address: null,
      role: "customer",
    };
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, address, role")
      .eq("id", user.id)
      .single()
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error) console.warn("[auth] profile fetch failed:", error.message);
          // Fail closed: if the profile can't be loaded, treat the visitor
          // as a plain customer rather than leaving `profile` null forever
          // (which would hang RequireAdmin on a blank screen indefinitely).
          setProfile(data ? (data as Profile) : FALLBACK);
        },
        (err: Error) => {
          if (cancelled) return;
          console.warn("[auth] profile fetch failed:", err.message);
          setProfile(FALLBACK);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      if (remember) localStorage.removeItem(EPHEMERAL_KEY);
      else localStorage.setItem(EPHEMERAL_KEY, "1");
      sessionStorage.setItem(TAB_KEY, "1");
      return null;
    },
    []
  );

  const signUp = useCallback(
    async (
      firstName: string,
      lastName: string,
      email: string,
      password: string
    ): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim() },
          emailRedirectTo: `${window.location.origin}/account/sign-in`,
        },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    []
  );

  const signOut = useCallback(async () => {
    // scope: "local" — signing out on this device must not silently end the
    // user's sessions on their other devices/tabs too (the default "global"
    // scope revokes every active session for the account).
    await supabase.auth.signOut({ scope: "local" });
    localStorage.removeItem(EPHEMERAL_KEY);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    return error ? error.message : null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? error.message : null;
  }, []);

  const updateProfile = useCallback(
    async (fields: { full_name?: string; phone?: string; address?: Address }) => {
      if (!user) return "Not signed in.";
      const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
      if (error) return error.message;
      setProfile((p) => (p ? { ...p, ...fields } : p));
      return null;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
