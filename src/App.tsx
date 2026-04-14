import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { DashboardLayoutProvider, useDashboardLayoutContext } from "@/contexts/DashboardLayoutContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { FilePreviewProvider } from "@/contexts/FilePreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimationProvider } from "@/contexts/AnimationContext";

import { ForceLightMode } from "@/components/ForceLightMode";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ErrorBoundary from "@/components/ErrorBoundary";

import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { LegacyProjectRedirect, LegacyTaskRedirect, LegacyPageRedirect, LegacyFileRedirect, LegacyGroupRedirect } from "@/components/LegacyRedirects";

import DashboardLayout from "@/components/layout/DashboardLayout";
import CheckoutLayoutWrapper from "@/components/layout/CheckoutLayoutWrapper";
import AdminLayout from "./components/layout/AdminLayout";

// Only Landing is statically imported (first page users see)
import Landing from "./pages/Landing";

// ═══ Lazy-loaded pages ═══
// Auth
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Auth = React.lazy(() => import("./pages/Auth"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const VerifyOtp = React.lazy(() => import("./pages/VerifyOtp"));
const ResetPasswordNew = React.lazy(() => import("./pages/ResetPasswordNew"));
const PasswordSuccess = React.lazy(() => import("./pages/PasswordSuccess"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

// Protected
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Groups = React.lazy(() => import("./pages/Groups"));
const GroupDetail = React.lazy(() => import("./pages/GroupDetail"));
const Communication = React.lazy(() => import("./pages/Communication"));
const CalendarPage = React.lazy(() => import("./pages/Calendar"));
const Feedback = React.lazy(() => import("./pages/Feedback"));
const PersonalInfo = React.lazy(() => import("./pages/PersonalInfo"));
const AccountSettings = React.lazy(() => import("./pages/AccountSettings"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const Tips = React.lazy(() => import("./pages/Tips"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const SearchPage = React.lazy(() => import("./pages/Search"));
const ServicePlan = React.lazy(() => import("./pages/ServicePlan"));
const BillingHistory = React.lazy(() => import("./pages/BillingHistory"));
const JoinProject = React.lazy(() => import("./pages/JoinProject"));

// Admin
const AdminActivity = React.lazy(() => import("./pages/AdminActivity"));
const AdminBackup = React.lazy(() => import("./pages/AdminBackup"));
const AdminSystem = React.lazy(() => import("./pages/AdminSystem"));
const AdminBilling = React.lazy(() => import("./pages/AdminBilling"));
const AdminUserBilling = React.lazy(() => import("./pages/AdminUserBilling"));
const MemberManagement = React.lazy(() => import("./pages/MemberManagement"));
const Utilities = React.lazy(() => import("./pages/Utilities"));

// Checkout
const Checkout = React.lazy(() => import("./pages/Checkout"));
const CheckoutPayment = React.lazy(() => import("./pages/CheckoutPayment"));
const AddonCheckout = React.lazy(() => import("./pages/AddonCheckout"));
const AddonCheckoutPayment = React.lazy(() => import("./pages/AddonCheckoutPayment"));
const PaymentResult = React.lazy(() => import("./pages/PaymentResult"));
const CheckoutSummary = React.lazy(() => import("./pages/CheckoutSummary"));

// Public
const PublicProjectView = React.lazy(() => import("./pages/PublicProjectView"));
const PublicProfile = React.lazy(() => import("./pages/PublicProfile"));
const PublicTaskPreview = React.lazy(() => import("./pages/PublicTaskPreview"));
const FilePreview = React.lazy(() => import("./pages/FilePreview"));

// Workspace
const WorkspaceSettings = React.lazy(() => import("./pages/WorkspaceSettings"));
const WorkspaceMembers = React.lazy(() => import("./pages/WorkspaceMembers"));
const CreateWorkspace = React.lazy(() => import("./pages/CreateWorkspace"));
const Upgrade = React.lazy(() => import("./pages/Upgrade"));

// Misc
const Pricing = React.lazy(() => import("./pages/Pricing"));
const PricingDocs = React.lazy(() => import("./pages/PricingDocs"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Guide = React.lazy(() => import("./pages/Guide"));
const DownloadPage = React.lazy(() => import("./pages/Download"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Heavy pages (already lazy)
const CreateCustomProject = React.lazy(() => import("./pages/CreateCustomProject"));
const PublicCanvasPage = React.lazy(() => import("./pages/PublicCanvasPage"));
const AIAssistant = React.lazy(() => import("./pages/AIAssistant"));
const UIPreview = React.lazy(() => import("./pages/UIPreview"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isApproved, profile } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedLayoutInner() {
  const { projectInfo } = useDashboardLayoutContext();
  return (
    <DashboardLayout 
      useOutlet 
      projectId={projectInfo.projectId} 
      projectName={projectInfo.projectName} 
      zaloLink={projectInfo.zaloLink} 
    />
  );
}

function ProtectedLayout() {
  const { user, isLoading, profile } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/login" replace />;

  return (
    <DashboardLayoutProvider>
      <ProtectedLayoutInner />
    </DashboardLayoutProvider>
  );
}

function AppRoutes() {
  const recoveryHash = typeof window !== "undefined" ? window.location.hash : "";
  
  // Handle recovery links → redirect to reset password
  const shouldRedirectRecovery =
    typeof window !== "undefined" &&
    window.location.pathname === "/" &&
    recoveryHash.includes("type=recovery");

  if (shouldRedirectRecovery) {
    window.location.replace(`/reset-password${recoveryHash}`);
    return null;
  }

  // Legacy: handle signup confirmation links (no longer used, but handle gracefully)
  const shouldRedirectSignup =
    typeof window !== "undefined" &&
    window.location.pathname === "/" &&
    recoveryHash.includes("type=signup");

  if (shouldRedirectSignup) {
    supabase.auth.signOut({ scope: 'local' }).then(() => {
      window.location.replace(`/auth`);
    });
    return null;
  }

  return (
    <LanguageProvider>
    <PageTransition>
      <Suspense fallback={null}>
      <Routes>
        {/* ═══ Localized public routes — EN (root) ═══ */}
        <Route path="/" element={<ForceLightMode><Landing /></ForceLightMode>} />
        <Route path="/auth" element={<ForceLightMode><Auth /></ForceLightMode>} />
        <Route path="/login" element={<ForceLightMode><Login /></ForceLightMode>} />
        <Route path="/register" element={<ForceLightMode><Register /></ForceLightMode>} />
        <Route path="/forgot-password" element={<ForceLightMode><ForgotPassword /></ForceLightMode>} />
        <Route path="/verify-otp" element={<ForceLightMode><VerifyOtp /></ForceLightMode>} />
        <Route path="/reset-password-new" element={<ForceLightMode><ResetPasswordNew /></ForceLightMode>} />
        <Route path="/password-success" element={<ForceLightMode><PasswordSuccess /></ForceLightMode>} />
        <Route path="/pricing" element={<ForceLightMode><Pricing /></ForceLightMode>} />
        <Route path="/download" element={<ForceLightMode><DownloadPage /></ForceLightMode>} />
        <Route path="/guide" element={<ForceLightMode><Guide /></ForceLightMode>} />
        <Route path="/guide/terms" element={<ForceLightMode><Terms /></ForceLightMode>} />
        <Route path="/guide/pricing" element={<ForceLightMode><PricingDocs /></ForceLightMode>} />
        <Route path="/guide/privacy" element={<ForceLightMode><Privacy /></ForceLightMode>} />

        {/* ═══ Localized public routes — Vietnamese (/vi) ═══ */}
        <Route path="/vi">
          <Route index element={<ForceLightMode><Landing /></ForceLightMode>} />
          <Route path="auth" element={<ForceLightMode><Auth /></ForceLightMode>} />
          <Route path="login" element={<ForceLightMode><Login /></ForceLightMode>} />
          <Route path="register" element={<ForceLightMode><Register /></ForceLightMode>} />
          <Route path="forgot-password" element={<ForceLightMode><ForgotPassword /></ForceLightMode>} />
          <Route path="verify-otp" element={<ForceLightMode><VerifyOtp /></ForceLightMode>} />
          <Route path="reset-password-new" element={<ForceLightMode><ResetPasswordNew /></ForceLightMode>} />
          <Route path="password-success" element={<ForceLightMode><PasswordSuccess /></ForceLightMode>} />
          <Route path="pricing" element={<ForceLightMode><Pricing /></ForceLightMode>} />
          <Route path="download" element={<ForceLightMode><DownloadPage /></ForceLightMode>} />
          <Route path="guide" element={<ForceLightMode><Guide /></ForceLightMode>} />
          <Route path="guide/terms" element={<ForceLightMode><Terms /></ForceLightMode>} />
          <Route path="guide/pricing" element={<ForceLightMode><PricingDocs /></ForceLightMode>} />
          <Route path="guide/privacy" element={<ForceLightMode><Privacy /></ForceLightMode>} />
        </Route>

        {/* ═══ Non-localized public routes ═══ */}
        <Route path="/project/:projectSlug/task/:taskSlug" element={<ForceLightMode><PublicTaskPreview /></ForceLightMode>} />
        <Route path="/project/:projectSlug" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/s/:shareToken" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/s/:shareToken/t/:taskSlug/f/:fileIndex" element={<ForceLightMode><FilePreview /></ForceLightMode>} />
        <Route path="/public/project/:shareToken" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/share/:token/page/:pageSlug" element={<ForceLightMode><Suspense fallback={null}><PublicCanvasPage /></Suspense></ForceLightMode>} />
        <Route path="/share/:token/page" element={<ForceLightMode><Suspense fallback={null}><PublicCanvasPage /></Suspense></ForceLightMode>} />
        <Route path="/reset-password" element={<ForceLightMode><ResetPassword /></ForceLightMode>} />
        <Route path="/ui-preview" element={<ForceLightMode><Suspense fallback={null}><UIPreview /></Suspense></ForceLightMode>} />
        <Route path="/join" element={<JoinProject />} />
        {/* ═══ Invoice summary — accessible without login (handles own auth guard) ═══ */}
        <Route path="/checkout/summary/:orderCode" element={<CheckoutSummary />} />
        <Route path="/addon-checkout/summary/:orderCode" element={<CheckoutSummary />} />
        <Route path="/auth/member" element={<Navigate to="/login" replace />} />
        <Route path="/auth/admin" element={<Navigate to="/login" replace />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/u/:username" element={<ForceLightMode><PublicProfile /></ForceLightMode>} />
        <Route path="/file-preview" element={<ForceLightMode><FilePreview /></ForceLightMode>} />

        {/* ═══ Protected routes with persistent DashboardLayout ═══ */}
        {/* ═══ Standalone checkout routes (smart layout) ═══ */}
        <Route element={<ProtectedRoute><CheckoutLayoutWrapper /></ProtectedRoute>}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/result" element={<PaymentResult />} />
          <Route path="/checkout/payment/:orderCode" element={<CheckoutPayment />} />
          <Route path="/addon-checkout" element={<AddonCheckout />} />
          <Route path="/addon-checkout/payment/:orderCode" element={<AddonCheckoutPayment />} />
        </Route>

        {/* ═══ Protected routes with persistent DashboardLayout ═══ */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ai-assistant" element={<Suspense fallback={null}><AIAssistant /></Suspense>} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/groups" element={<Groups />} />
          {/* New URL format: /pr/ws-{wsShortId}/{projectSlug} */}
          <Route path="/pr/:wsParam/:projectSlug" element={<GroupDetail />} />
          <Route path="/pr/:wsParam/:projectSlug/t/:taskSlug" element={<GroupDetail />} />
          <Route path="/pr/:wsParam/:projectSlug/t/:taskSlug/f/:fileIndex" element={<ProtectedRoute><FilePreview /></ProtectedRoute>} />
          {/* Page format: /pa/ws-{wsShortId}/{projectSlug} */}
          <Route path="/pa/:wsParam/:projectSlug" element={<GroupDetail />} />
          {/* Legacy redirects */}
          <Route path="/p/:projectSlug" element={<LegacyProjectRedirect />} />
          <Route path="/p/:projectSlug/page/:pageSlug" element={<LegacyPageRedirect />} />
          <Route path="/p/:projectSlug/t/:taskSlug" element={<LegacyTaskRedirect />} />
          <Route path="/p/:projectSlug/t/:taskSlug/f/:fileIndex" element={<LegacyFileRedirect />} />
          <Route path="/groups/:groupId" element={<LegacyGroupRedirect />} />
          <Route path="/groups/:groupId/tasks/:taskId" element={<LegacyGroupRedirect />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/personal-info" element={<PersonalInfo />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/tips" element={<Tips />} />
          {/* ═══ Admin routes (nested with secondary sidebar) ═══ */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="members" element={<MemberManagement />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="billing/:userId" element={<AdminUserBilling />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="system" element={<AdminSystem />} />
            <Route path="utilities" element={<Utilities />} />
          </Route>
          {/* ═══ Workspace routes ═══ */}
          <Route path="/workspace/new" element={<CreateWorkspace />} />
          <Route path="/workspace/settings" element={<WorkspaceSettings />} />
          <Route path="/workspace/members" element={<WorkspaceMembers />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/create-custom" element={<Suspense fallback={null}><CreateCustomProject /></Suspense>} />
          <Route path="/service-plan" element={<ServicePlan />} />
          <Route path="/billing-history" element={<BillingHistory />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
    </LanguageProvider>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <WorkspaceProvider>
                    <AnimationProvider>
                      <NavigationProvider>
                        <FilePreviewProvider>
                          <AppRoutes />
                        </FilePreviewProvider>
                      </NavigationProvider>
                    </AnimationProvider>
                </WorkspaceProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
