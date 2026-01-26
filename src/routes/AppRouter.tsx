import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ApiHealthCheck from "../components/ApiHealthCheck";
import AppLayout from "../components/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../contexts/AuthContext";
import LoginPage from "../pages/LoginPage";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const EntriesPage = lazy(() => import("../pages/EntriesPage"));
const EntryCreatePage = lazy(() => import("../pages/EntryCreatePage"));
const EntryEditPage = lazy(() => import("../pages/EntryEditPage"));
const PlanningPage = lazy(() => import("../pages/PlanningPage"));
const ChangePasswordPage = lazy(() => import("../pages/ChangePasswordPage"));
const CategoriesPage = lazy(() => import("../pages/CategoriesPage"));
const CardInvoicePage = lazy(() => import("../pages/CardInvoicePage"));
const CardsPage = lazy(() => import("../pages/CardsPage"));
const AssistantPage = lazy(() => import("../pages/AssistantPage"));
const SignupPage = lazy(() => import("../pages/SignupPage"));

const AppRouter = () => (
  <BrowserRouter>
    <AuthProvider>
      <ApiHealthCheck />
      <Suspense fallback={<div className="p-6">Carregando.</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/entries/new" element={<EntryCreatePage />} />
            <Route path="/entries/:id/edit" element={<EntryEditPage />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/cards/:cardId/invoice" element={<CardInvoicePage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default AppRouter;
