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
import ProjectDeliverableEmail from "./pages/ProjectDeliverableEmail";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Commissions from "./pages/Commissions";
import Comptabilite from "./pages/Comptabilite";
import Invoices from "./pages/Invoices";
import Support from "./pages/Support";
import SupportForm from "./pages/SupportForm";
import WebmasterDashboard from "./pages/WebmasterDashboard";
import AgentMasterDashboard from "./pages/AgentMasterDashboard";
import MetaCallback from "./pages/MetaCallback";
import ClientForm from "./pages/ClientForm";
import ImportCSV from "./pages/ImportCSV";
import Campaigns from "./pages/Campaigns";
import NfcClients from "./pages/NfcClients";
import DeletedClients from "./pages/DeletedClients";
import DomainRenewals from "./pages/DomainRenewals";
import Privacy from "./pages/Privacy";
import LogoValidation from "./pages/LogoValidation";
import Terms from "./pages/Terms";
import DebugRealtime from "./pages/DebugRealtime";
import PartnerAccess from "./pages/PartnerAccess";
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
              element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/clients"
              element={<ProtectedRoute><AppLayout><Clients /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/clients/:id"
              element={<ProtectedRoute><AppLayout><ClientDetail /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/pipeline"
              element={<ProtectedRoute><AppLayout><Pipeline /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/prospection"
              element={<ProtectedRoute><AppLayout><Prospection /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/projets"
              element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/projets/:id"
              element={<ProtectedRoute><AppLayout><ProjectDetail /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/projets/:id/livrables/:deliverableId/envoyer"
              element={<ProtectedRoute><AppLayout><ProjectDeliverableEmail /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/webmaster"
              element={<ProtectedRoute><AppLayout><WebmasterDashboard /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/agent-master"
              element={<ProtectedRoute><AppLayout><AgentMasterDashboard /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/equipe"
              element={<ProtectedRoute><AppLayout><Team /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/commissions"
              element={<ProtectedRoute><AppLayout><Commissions /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/comptabilite"
              element={<ProtectedRoute><AppLayout><Comptabilite /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/facturation"
              element={<ProtectedRoute><AppLayout><Invoices /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/support"
              element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/parametres"
              element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/import-csv"
              element={<ProtectedRoute><AppLayout><ImportCSV /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/campagnes"
              element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/cartes-nfc"
              element={<ProtectedRoute><AppLayout><NfcClients /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/corbeille"
              element={<ProtectedRoute><AppLayout><DeletedClients /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/renouvellements-ndd"
              element={<ProtectedRoute><AppLayout><DomainRenewals /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/debug-realtime"
              element={<ProtectedRoute><AppLayout><DebugRealtime /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/acces-partenaire"
              element={<ProtectedRoute><AppLayout><PartnerAccess /></AppLayout></ProtectedRoute>}
            />
            {/* Public routes */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Public routes - short URLs */}
            <Route path="/s/:token" element={<SupportForm />} />
            <Route path="/f/:token/:type" element={<ClientForm />} />
            {/* Legacy long URLs (backward compat) */}
            <Route path="/support/:token" element={<SupportForm />} />
            <Route path="/formulaire/:token/:type" element={<ClientForm />} />
            <Route path="/valider-logo/:clientId" element={<LogoValidation />} />
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
