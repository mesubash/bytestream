import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/use-auth";
import { useEffect } from "react";
import { MouseSpotlight } from "@/components/mouse-spotlight";
import { CursorTrail } from "@/components/cursor-trail";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Watch from "@/pages/watch";
import Upload from "@/pages/upload";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth bypassed for preview — all routes render freely
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return <Component />;
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  return <Component />;
}

function RootRedirect() {
  const [_, setLocation] = useLocation();
  useEffect(() => { setLocation("/dashboard"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      
      {/* Public/Auth Routes */}
      <Route path="/login">
        <AuthRoute component={Login} />
      </Route>
      <Route path="/register">
        <AuthRoute component={Register} />
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/watch/:id">
        <ProtectedRoute component={Watch} />
      </Route>
      <Route path="/upload">
        <ProtectedRoute component={Upload} />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MouseSpotlight />
        <CursorTrail />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
