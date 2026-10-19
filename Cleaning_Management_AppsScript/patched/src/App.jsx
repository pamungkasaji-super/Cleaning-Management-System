import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import CleaningLogin from './pages/CleaningLogin';
import Dashboard from './pages/Dashboard';
import TaskDetail from './pages/TaskDetail';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import Periodik from './pages/Periodik';
import RouteTransition from './components/RouteTransition';
import BottomTabBar from './components/cleaning/BottomTabBar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  const isAdmin = user?.role === "admin";
  const showTabs = ["/dashboard", "/monitoring", "/periodik", "/task", "/settings"].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <>
      {user && showTabs && <BottomTabBar isAdmin={isAdmin} />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<RouteTransition><Login /></RouteTransition>} />


          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            {/* Add your page Route elements here */}
            <Route path="/" element={<RouteTransition><CleaningLogin /></RouteTransition>} />
            <Route path="/dashboard" element={<RouteTransition><Dashboard /></RouteTransition>} />
            <Route path="/task/:scheduleId" element={<RouteTransition><TaskDetail /></RouteTransition>} />
            <Route path="/periodik" element={<RouteTransition><Periodik /></RouteTransition>} />
            <Route path="/monitoring" element={<RouteTransition><Monitoring /></RouteTransition>} />
            <Route path="/settings" element={<RouteTransition><Settings /></RouteTransition>} />
          </Route>
          <Route path="*" element={<RouteTransition><PageNotFound /></RouteTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App