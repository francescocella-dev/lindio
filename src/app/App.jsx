import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAccountSetupRequiredError } from "../domain/account.ts";
import { isApplicationError, toApplicationError } from "../application/applicationError.ts";
import { buildMockLeads } from "../data/mockLeads.js";
import RouteLoadingFallback from "../components/layout/RouteLoadingFallback.jsx";
import {
  endDemoSession,
  getDemoAccount,
  getDemoUser,
  isDemoSessionActive,
  startDemoSession,
  updateDemoAccount
} from "../services/demoSessionService.js";
import { createLead, updateLead as updateLocalLeadRecord } from "../services/leadsService.js";
import {
  loadAuthService,
  loadNotificationService,
  loadSupabaseLeadsService
} from "../services/runtimeServiceLoader.js";
import { getStoredLeads, resetStoredMockData, setStoredLeads } from "../services/storageService.js";
import { isSupabaseConfigured } from "../services/supabaseConfig.js";

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
  return toApplicationError(error, "Errore durante il caricamento dei dati.").message;
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
  const leadsRef = useRef(leads);
  const location = useLocation();

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

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
    if (isDemoMode || !isSupabaseConfigured) {
      setIsAuthLoading(false);
      return undefined;
    }

    let mounted = true;
    let unsubscribe = () => {};
    setIsAuthLoading(true);

    async function initializeAuth() {
      try {
        const authService = await loadAuthService();

        if (!mounted) return;

        unsubscribe = authService.subscribeToAuthChanges((event, session) => {
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

        const session = await authService.getCurrentSession();

        if (mounted) {
          setAuthSession(session);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(getFriendlyAuthError(error));
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    }

    void initializeAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isDemoMode]);

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
        const authService = await loadAuthService();
        const account = await authService.fetchProfileWithOrganization();

        if (cancelled || accountLoadId.current !== currentLoadId) return;

        setProfile(account.profile);
        setOrganization(account.organization);
        setNeedsOnboarding(false);
        setAuthError("");

        const leadService = await loadSupabaseLeadsService();
        const remoteLeads = await leadService.fetchSupabaseLeads();

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

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id, isDemoMode]);

  useEffect(() => {
    if (!isLoggedIn || !profile?.notificationEnabled) return undefined;

    let cancelled = false;

    async function runReminderCheck() {
      try {
        const notificationService = await loadNotificationService();

        if (!cancelled) {
          await notificationService.checkReminderNotifications(leads, profile);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Impossibile caricare il runtime dei promemoria", error);
        }
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        void runReminderCheck();
      }
    }

    void runReminderCheck();

    const interval = window.setInterval(() => {
      void runReminderCheck();
    }, 30_000);

    const handleFocus = () => {
      void runReminderCheck();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, leads, profile]);

  async function reloadLeadsFromSupabase() {
    if (!isDatabaseMode) return;

    setIsDataLoading(true);
    setDataError("");

    try {
      const leadService = await loadSupabaseLeadsService();
      const remoteLeads = await leadService.fetchSupabaseLeads();
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
          const authService = await loadAuthService();
          const data = await authService.signInWithEmailPassword(email, password);
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
          const authService = await loadAuthService();
          const result = await authService.signUpWithEmailPassword(input);

          if (result.hasSession) {
            const session = await authService.getCurrentSession();
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
          const authService = await loadAuthService();
          await authService.requestPasswordReset({
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
        const authService = await loadAuthService();
        await authService.updateUserPassword(newPassword);
        setIsPasswordRecovery(false);
      },

      changePassword: async (newPassword) => {
        const authService = await loadAuthService();
        return authService.updateUserPassword(newPassword);
      },

      enterDemo: () => {
        const account = getDemoAccount();
        startDemoSession();
        setIsDemoMode(true);
        setIsAuthLoading(false);
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
          setIsAuthLoading(Boolean(isSupabaseConfigured));
          setProfile(null);
          setOrganization(null);
          setLeads([]);
          return;
        }

        try {
          const authService = await loadAuthService();
          await authService.signOutFromSupabase();
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

        const authService = await loadAuthService();
        const account = await authService.bootstrapAccount(input);
        setProfile(account.profile);
        setOrganization(account.organization);
        setNeedsOnboarding(false);
        setAuthError("");

        try {
          const leadService = await loadSupabaseLeadsService();
          const remoteLeads = await leadService.fetchSupabaseLeads();
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

        let account;

        if (isDemoMode) {
          account = updateDemoAccount({
            organizationId: organization.id,
            profile: profileDraft,
            organization: organizationDraft
          });
        } else {
          const authService = await loadAuthService();
          account = await authService.updateAccountProfile({
            organizationId: organization.id,
            profile: profileDraft,
            organization: organizationDraft
          });
        }

        setProfile(account.profile);
        setOrganization(account.organization);
        return account;
      },

      leads,

      addLead: async (lead) => {
        setDataError("");

        try {
          if (isDatabaseMode) {
            const leadService = await loadSupabaseLeadsService();
            const createdLead = await leadService.createSupabaseLead(lead, organization.id);
            setLeads((currentLeads) => [createdLead, ...currentLeads]);
            return createdLead;
          }

          if (!isDemoMode) {
            throw new Error("Accedi o apri la demo prima di creare una richiesta.");
          }

          const createdLead = createLead(lead);
          setLeads((currentLeads) => [createdLead, ...currentLeads]);
          return createdLead;
        } catch (error) {
          const applicationError = toApplicationError(
            error,
            "Errore durante la creazione della richiesta."
          );
          setDataError(applicationError.message);
          throw applicationError;
        }
      },

      updateLead: async (lead) => {
        const previousLead = leadsRef.current.find((item) => item.id === lead.id);

        if (!previousLead) {
          const error = toApplicationError(
            new Error("La richiesta non è più disponibile nello stato locale."),
            "La richiesta non è più disponibile."
          );
          setDataError(error.message);
          throw error;
        }

        setDataError("");

        if (isDemoMode) {
          const nextLeads = updateLocalLeadRecord(leadsRef.current, lead);
          const savedLead = nextLeads.find((item) => item.id === lead.id);
          setLeads(nextLeads);
          return savedLead;
        }

        if (!isDatabaseMode) {
          const error = toApplicationError(new Error("Workspace non disponibile."));
          setDataError(error.message);
          throw error;
        }

        try {
          const leadService = await loadSupabaseLeadsService();
          const savedLead = await leadService.updateSupabaseLead(lead, previousLead);
          setLeads((currentLeads) =>
            currentLeads.map((item) => (item.id === savedLead.id ? savedLead : item))
          );
          setDataError("");
          return savedLead;
        } catch (error) {
          const applicationError = toApplicationError(
            error,
            "Errore durante il salvataggio della richiesta."
          );
          setDataError(applicationError.message);

          if (isApplicationError(applicationError) && applicationError.code === "CONFLICT") {
            try {
              const leadService = await loadSupabaseLeadsService();
              const remoteLeads = await leadService.fetchSupabaseLeads();
              setLeads(remoteLeads);
            } catch (reloadError) {
              console.error("Impossibile ricaricare i dati dopo il conflitto", reloadError);
            }
          }

          console.error(error);
          throw applicationError;
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
            void reloadLeadsFromSupabase();
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

  if (
    !isLoggedIn &&
    !PUBLIC_AUTH_PATHS.has(location.pathname) &&
    location.pathname !== "/reset-password"
  ) {
    return <Navigate to="/login" replace />;
  }

  if (
    isLoggedIn &&
    needsOnboarding &&
    !["/onboarding", "/reset-password"].includes(location.pathname)
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoggedIn && !needsOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/today" replace />;
  }

  if (isLoggedIn && PUBLIC_AUTH_PATHS.has(location.pathname)) {
    return <Navigate to="/today" replace />;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Outlet context={appContext} />
    </Suspense>
  );
}
