import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Pipeline from "./pages/Pipeline";
import Prospection from "./pages/Prospection";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Commissions from "./pages/Commissions";
import Comptabilite from "./pages/Comptabilite";
import WebmasterDashboard from "./pages/WebmasterDashboard";
import MetaCallback from "./pages/MetaCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout><Dashboard /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <AppLayout><Clients /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <AppLayout><ClientDetail /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <AppLayout><Pipeline /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/prospection"
              element={
                <ProtectedRoute>
                  <AppLayout><Prospection /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projets"
              element={
                <ProtectedRoute>
                  <AppLayout><Projects /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projets/:id"
              element={
                <ProtectedRoute>
                  <AppLayout><ProjectDetail /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/webmaster"
              element={
                <ProtectedRoute>
                  <AppLayout><WebmasterDashboard /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe"
              element={
                <ProtectedRoute>
                  <AppLayout><Team /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions"
              element={
                <ProtectedRoute>
                  <AppLayout><Commissions /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comptabilite"
              element={
                <ProtectedRoute>
                  <AppLayout><Comptabilite /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres"
              element={
                <ProtectedRoute>
                  <AppLayout><Settings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/meta-callback" element={
              <ProtectedRoute><MetaCallback /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
