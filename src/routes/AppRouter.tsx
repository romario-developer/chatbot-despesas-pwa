import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardPage from "../pages/DashboardPage";
import EntriesPage from "../pages/EntriesPage";
import EntryFormPlaceholder from "../pages/EntryFormPlaceholder";
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
        <Route path="/entries/new" element={<EntryFormPlaceholder />} />
        <Route path="/entries/:id/edit" element={<EntryFormPlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
