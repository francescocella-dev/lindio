import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import SignupPage from "../pages/SignupPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../pages/ResetPasswordPage.jsx";
import OnboardingPage from "../pages/OnboardingPage.jsx";
import TodayPage from "../pages/TodayPage.jsx";
import LeadsPage from "../pages/LeadsPage.jsx";
import NewLeadPage from "../pages/NewLeadPage.jsx";
import LeadDetailPage from "../pages/LeadDetailPage.jsx";
import ReportPage from "../pages/ReportPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

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
