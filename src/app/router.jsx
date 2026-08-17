import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx";

const AppLayout = lazy(() => import("../components/layout/AppLayout.jsx"));
const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("../pages/SignupPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage.jsx"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage.jsx"));
const TodayPage = lazy(() => import("../pages/TodayPage.jsx"));
const LeadsPage = lazy(() => import("../pages/LeadsPage.jsx"));
const NewLeadPage = lazy(() => import("../pages/NewLeadPage.jsx"));
const LeadDetailPage = lazy(() => import("../pages/LeadDetailPage.jsx"));
const ReportPage = lazy(() => import("../pages/ReportPage.jsx"));
const SettingsPage = lazy(() => import("../pages/SettingsPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/today" replace /> },
          { path: "today", element: <TodayPage /> },
          { path: "leads", element: <LeadsPage /> },
          { path: "leads/new", element: <NewLeadPage /> },
          { path: "leads/:id", element: <LeadDetailPage /> },
          { path: "report", element: <ReportPage /> },
          { path: "settings", element: <SettingsPage /> }
        ]
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
