import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardPage from "../pages/DashboardPage";
import EntriesPage from "../pages/EntriesPage";
import EntryCreatePage from "../pages/EntryCreatePage";
import EntryEditPage from "../pages/EntryEditPage";
import PlanningPage from "../pages/PlanningPage";
import LoginPage from "../pages/LoginPage";

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
