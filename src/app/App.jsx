import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAccountSetupRequiredError } from "../domain/account.ts";
import { buildMockLeads } from "../data/mockLeads.js";
import {
  bootstrapAccount,
  fetchProfileWithOrganization,
  getCurrentSession,
  requestPasswordReset,
  signInWithEmailPassword,
  signOutFromSupabase,
  signUpWithEmailPassword,
  subscribeToAuthChanges,
  updateAccountProfile,
  updateUserPassword
} from "../services/authService.js";
import {
  endDemoSession,
  getDemoAccount,
  getDemoUser,
  isDemoSessionActive,
  startDemoSession,
  updateDemoAccount
} from "../services/demoSessionService.js";
import { createLead, updateLead as updateLocalLeadRecord } from "../services/leadsService.js";
import { getStoredLeads, resetStoredMockData, setStoredLeads } from "../services/storageService.js";
import {
  createSupabaseLead,
  fetchSupabaseLeads,
  updateSupabaseLead
} from "../services/supabaseLeadsService.js";
import { checkReminderNotifications } from "../services/notificationService.js";
import { isSupabaseConfigured } from "../services/supabaseClient.js";

const PUBLIC_AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password"]);

function getFriendlyAuthError(error) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o password non corretti.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Email non ancora confermata. Controlla la casella di posta.";
  }

  if (normalized.includes("user already registered")) {
    return "Esiste già un account con questa email.";
  }

  return message || "Errore durante l’accesso.";
}

function getFriendlyDataError(error) {
  const message = error?.message || "";

  if (message.toLowerCase().includes("row-level security")) {
    return "Operazione bloccata dalle regole di sicurezza. Controlla il profilo aziendale.";
  }

  return message || "Errore durante il caricamento dei dati.";
}

export default function App() {
  const initialDemoMode = isDemoSessionActive();
  const initialDemoAccount = initialDemoMode ? getDemoAccount() : null;

  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const [authSession, setAuthSession] = useState(null);
  const [profile, setProfile] = useState(initialDemoAccount?.profile || null);
  const [organization, setOrganization] = useState(initialDemoAccount?.organization || null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const [isAuthLoading, setIsAuthLoading] = useState(
    Boolean(!initialDemoMode && isSupabaseConfigured)
  );
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [authError, setAuthError] = useState("");
  const [dataError, setDataError] = useState("");

  const [leads, setLeads] = useState(() =>
    initialDemoMode ? getStoredLeads(buildMockLeads()) : []
  );

  const accountLoadId = useRef(0);
  const location = useLocation();
  const authUser = isDemoMode ? getDemoUser() : authSession?.user || null;
  const isLoggedIn = Boolean(isDemoMode || authSession?.user);
  const isDatabaseMode = Boolean(
    !isDemoMode && isSupabaseConfigured && authSession?.user && organization?.id
  );

  useEffect(() => {
    if (isDemoMode) {
      setStoredLeads(leads);
    }
  }, [isDemoMode, leads]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return undefined;
    }

    let mounted = true;

    getCurrentSession()
      .then((session) => {
        if (mounted) {
          setAuthSession(session);
        }
      })
      .catch((error) => {
        if (mounted) {
          setAuthError(getFriendlyAuthError(error));
        }
      })
      .finally(() => {
        if (mounted) {
          setIsAuthLoading(false);
        }
      });

    const unsubscribe = subscribeToAuthChanges((event, session) => {
      if (!mounted) return;

      setAuthSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      if (event === "SIGNED_OUT") {
        setNeedsOnboarding(false);
        setProfile(null);
        setOrganization(null);
        setLeads([]);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentLoadId = accountLoadId.current + 1;
    accountLoadId.current = currentLoadId;

    if (isDemoMode) {
      const account = getDemoAccount();
      setProfile(account.profile);
      setOrganization(account.organization);
      setNeedsOnboarding(false);
      setAuthError("");
      setDataError("");
      setLeads(getStoredLeads(buildMockLeads()));
      setIsDataLoading(false);
      return undefined;
    }

    if (!authSession?.user) {
      setProfile(null);
      setOrganization(null);
      setNeedsOnboarding(false);
      setLeads([]);
      setIsDataLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsDataLoading(true);
    setDataError("");

    async function loadWorkspace() {
      try {
        const account = await fetchProfileWithOrganization();

        if (cancelled || accountLoadId.current !== currentLoadId) return;

        setProfile(account.profile);
        setOrganization(account.organization);
        setNeedsOnboarding(false);
        setAuthError("");

        const remoteLeads = await fetchSupabaseLeads();

        if (cancelled || accountLoadId.current !== currentLoadId) return;
        setLeads(remoteLeads);
      } catch (error) {
        if (cancelled || accountLoadId.current !== currentLoadId) return;

        if (isAccountSetupRequiredError(error)) {
          setProfile(null);
          setOrganization(null);
          setNeedsOnboarding(true);
          setAuthError("");
          setLeads([]);
          return;
        }

        const friendlyError = getFriendlyDataError(error);
        setProfile(null);
        setOrganization(null);
        setNeedsOnboarding(false);
        setDataError(friendlyError);
        console.error(error);
      } finally {
        if (!cancelled && accountLoadId.current === currentLoadId) {
          setIsDataLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id, isDemoMode]);

  useEffect(() => {
    if (!isLoggedIn || !profile?.notificationEnabled) return undefined;

    function runReminderCheck() {
      checkReminderNotifications(leads, profile);
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        runReminderCheck();
      }
    }

    runReminderCheck();

    const interval = window.setInterval(runReminderCheck, 30_000);
    window.addEventListener("focus", runReminderCheck);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runReminderCheck);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, leads, profile]);

  async function reloadLeadsFromSupabase() {
    if (!isDatabaseMode) return;

    setIsDataLoading(true);
    setDataError("");

    try {
      const remoteLeads = await fetchSupabaseLeads();
      setLeads(remoteLeads);
    } catch (error) {
      const friendlyError = getFriendlyDataError(error);
      setDataError(friendlyError);
      console.error(error);
      throw new Error(friendlyError);
    } finally {
      setIsDataLoading(false);
    }
  }

  const appContext = useMemo(
    () => ({
      isLoggedIn,
      isAuthLoading,
      isDataLoading,
      isSupabaseConfigured,
      isDatabaseMode,
      isDemoMode,
      needsOnboarding,
      isPasswordRecovery,
      authUser,
      profile,
      organization,
      authError,
      dataError,

      login: async (email, password) => {
        setAuthError("");

        try {
          const data = await signInWithEmailPassword(email, password);
          setAuthSession(data.session || null);
          return data;
        } catch (error) {
          const friendlyError = getFriendlyAuthError(error);
          setAuthError(friendlyError);
          throw new Error(friendlyError);
        }
      },

      signup: async (input) => {
        setAuthError("");

        try {
          const result = await signUpWithEmailPassword(input);

          if (result.hasSession) {
            const session = await getCurrentSession();
            setAuthSession(session);
          }

          return result;
        } catch (error) {
          const friendlyError = getFriendlyAuthError(error);
          setAuthError(friendlyError);
          throw new Error(friendlyError);
        }
      },

      sendPasswordReset: async (email) => {
        setAuthError("");

        try {
          await requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}/reset-password`
          });
        } catch (error) {
          const friendlyError = getFriendlyAuthError(error);
          setAuthError(friendlyError);
          throw new Error(friendlyError);
        }
      },

      completePasswordRecovery: async (newPassword) => {
        await updateUserPassword(newPassword);
        setIsPasswordRecovery(false);
      },

      enterDemo: () => {
        const account = getDemoAccount();
        startDemoSession();
        setIsDemoMode(true);
        setProfile(account.profile);
        setOrganization(account.organization);
        setNeedsOnboarding(false);
        setAuthError("");
        setDataError("");
        setLeads(getStoredLeads(buildMockLeads()));
      },

      logout: async () => {
        setAuthError("");

        if (isDemoMode) {
          endDemoSession();
          setIsDemoMode(false);
          setProfile(null);
          setOrganization(null);
          setLeads([]);
          return;
        }

        try {
          await signOutFromSupabase();
        } finally {
          setAuthSession(null);
          setProfile(null);
          setOrganization(null);
          setNeedsOnboarding(false);
          setLeads([]);
        }
      },

      completeOnboarding: async (input) => {
        if (isDemoMode) {
          throw new Error("La demo non richiede configurazione iniziale.");
        }

        const account = await bootstrapAccount(input);
        setProfile(account.profile);
        setOrganization(account.organization);
        setNeedsOnboarding(false);
        setAuthError("");

        try {
          const remoteLeads = await fetchSupabaseLeads();
          setLeads(remoteLeads);
        } catch (error) {
          const friendlyError = getFriendlyDataError(error);
          setDataError(friendlyError);
          console.error(error);
        }

        return account;
      },

      updateAccount: async ({ profile: profileDraft, organization: organizationDraft }) => {
        if (!organization?.id) {
          throw new Error("Profilo non disponibile.");
        }

        const account = isDemoMode
          ? updateDemoAccount({
              organizationId: organization.id,
              profile: profileDraft,
              organization: organizationDraft
            })
          : await updateAccountProfile({
              organizationId: organization.id,
              profile: profileDraft,
              organization: organizationDraft
            });

        setProfile(account.profile);
        setOrganization(account.organization);
        return account;
      },

      leads,

      addLead: async (lead) => {
        if (isDatabaseMode) {
          const createdLead = await createSupabaseLead(lead, organization.id);
          setLeads((currentLeads) => [createdLead, ...currentLeads]);
          return createdLead;
        }

        if (!isDemoMode) {
          throw new Error("Accedi o apri la demo prima di creare una richiesta.");
        }

        const createdLead = createLead(lead);
        setLeads((currentLeads) => [createdLead, ...currentLeads]);
        return createdLead;
      },

      updateLead: async (lead) => {
        const previousLead = leads.find((item) => item.id === lead.id);

        if (isDemoMode) {
          setLeads((currentLeads) => updateLocalLeadRecord(currentLeads, lead));
          return;
        }

        if (!isDatabaseMode) {
          throw new Error("Workspace non disponibile.");
        }

        setLeads((currentLeads) => updateLocalLeadRecord(currentLeads, lead));

        try {
          const savedLead = await updateSupabaseLead(lead, previousLead);
          setLeads((currentLeads) =>
            currentLeads.map((item) => (item.id === savedLead.id ? savedLead : item))
          );
          return savedLead;
        } catch (error) {
          const friendlyError = getFriendlyDataError(error);
          setDataError(friendlyError);

          if (previousLead) {
            setLeads((currentLeads) =>
              currentLeads.map((item) => (item.id === previousLead.id ? previousLead : item))
            );
          }

          console.error(error);
          throw new Error(friendlyError);
        }
      },

      reloadLeads: async () => {
        if (isDatabaseMode) {
          await reloadLeadsFromSupabase();
        }
      },

      resetMockData: () => {
        if (!isDemoMode) {
          if (isDatabaseMode) {
            reloadLeadsFromSupabase();
          }
          return;
        }

        const freshLeads = buildMockLeads();
        resetStoredMockData();
        setStoredLeads(freshLeads);
        setLeads(freshLeads);
      }
    }),
    [
      isLoggedIn,
      isAuthLoading,
      isDataLoading,
      isDatabaseMode,
      isDemoMode,
      needsOnboarding,
      isPasswordRecovery,
      authUser,
      profile,
      organization,
      authError,
      dataError,
      leads
    ]
  );

  const showWorkspaceLoader =
    isAuthLoading || (isLoggedIn && isDataLoading && !profile && !needsOnboarding);

  if (showWorkspaceLoader) {
    return (
      <main className="app-loading-page">
        <section className="app-loading-card" aria-live="polite">
          <img className="app-loading-logo" src="/brand/lindio-logo.png" alt="Lindio" />
          <div className="app-loading-spinner" aria-hidden="true" />
          <div className="app-loading-copy">
            <strong>Caricamento area di lavoro</strong>
            <span>Stiamo preparando richieste, promemoria e profilo.</span>
          </div>
        </section>
      </main>
    );
  }

  if (!isLoggedIn && !PUBLIC_AUTH_PATHS.has(location.pathname) && location.pathname !== "/reset-password") {
    return <Navigate to="/login" replace />;
  }

  if (isLoggedIn && needsOnboarding && !["/onboarding", "/reset-password"].includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoggedIn && !needsOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/today" replace />;
  }

  if (isLoggedIn && PUBLIC_AUTH_PATHS.has(location.pathname)) {
    return <Navigate to="/today" replace />;
  }

  return <Outlet context={appContext} />;
}
