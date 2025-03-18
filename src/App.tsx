
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RootLayout from "@/components/RootLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateStatement from "./pages/CreateStatement";
import AdminGuidelines from "./pages/admin/Guidelines";
import AdminSampleStatements from "./pages/admin/SampleStatements";
import AdminSettings from "./pages/admin/Settings";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Initialize the query client
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Protected routes */}
              <Route path="/create" element={
                <ProtectedRoute>
                  <CreateStatement />
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin/guidelines" element={
                <ProtectedRoute requireAdmin>
                  <AdminGuidelines />
                </ProtectedRoute>
              } />
              <Route path="/admin/samples" element={
                <ProtectedRoute requireAdmin>
                  <AdminSampleStatements />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
