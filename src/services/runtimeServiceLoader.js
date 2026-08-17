let authServicePromise;
let supabaseLeadsServicePromise;
let notificationServicePromise;

function loadWithRetry(getPromise, setPromise, importer) {
  const currentPromise = getPromise();

  if (currentPromise) {
    return currentPromise;
  }

  const nextPromise = importer().catch((error) => {
    setPromise(undefined);
    throw error;
  });

  setPromise(nextPromise);
  return nextPromise;
}

export function loadAuthService() {
  return loadWithRetry(
    () => authServicePromise,
    (value) => {
      authServicePromise = value;
    },
    () => import("./authService.js")
  );
}

export function loadSupabaseLeadsService() {
  return loadWithRetry(
    () => supabaseLeadsServicePromise,
    (value) => {
      supabaseLeadsServicePromise = value;
    },
    () => import("./supabaseLeadsService.js")
  );
}

export function loadNotificationService() {
  return loadWithRetry(
    () => notificationServicePromise,
    (value) => {
      notificationServicePromise = value;
    },
    () => import("./notificationService.js")
  );
}
