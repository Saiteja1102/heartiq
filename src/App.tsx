import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import Consult from "./pages/Consult";
import Medicines from "./pages/Medicines";
import Chat from "./pages/Chat";
import Call from "./pages/Call";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/AppShell";
import { DoctorShell } from "./components/DoctorShell";
import { Chatbot } from "./components/Chatbot";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import EcgQueue from "./pages/doctor/EcgQueue";
import Patients from "./pages/doctor/Patients";
import Appointments from "./pages/doctor/Appointments";
import Availability from "./pages/doctor/Availability";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/call/:sessionId" element={<Call />} />

            {/* Patient routes */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/consult" element={<Consult />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/chat" element={<Chat />} />
            </Route>

            {/* Doctor routes */}
            <Route element={<DoctorShell />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<Patients />} />
              <Route path="/doctor/ecg-queue" element={<EcgQueue />} />
              <Route path="/doctor/appointments" element={<Appointments />} />
              <Route path="/doctor/availability" element={<Availability />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Chatbot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
