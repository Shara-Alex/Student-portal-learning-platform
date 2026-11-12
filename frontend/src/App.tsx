import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./layout/AppShell";
import { ApiError } from "./lib/api";
import { ApplyPage } from "./modules/admissions/ApplyPage";
import { useMe } from "./modules/core/api";
import { AppsPage } from "./modules/core/AppsPage";
import { HomePage } from "./modules/core/HomePage";
import { LoginPage } from "./modules/core/LoginPage";
import { NotFoundPage } from "./modules/core/NotFoundPage";
import type { Role } from "./modules/core/types";
import { modules } from "./modules/registry";

const queryClient = new QueryClient({
  // Runs for every load that fails, anywhere in the app.
  queryCache: new QueryCache({
    onError: (error) => {
      // 401 = the login has run out (lib/api.ts has already tried to renew it). Send the person to sign in again.
      if (error instanceof ApiError && error.status === 401 && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    },
  }),
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

/** Shows a page only to the roles that may open it. Typing /fees as a teacher gets a plain "not yours" message. */
function OnlyFor({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useMe().data?.role;
  if (!role) return null; // still finding out who is logged in
  return roles.includes(role) ? children : <NotFoundPage denied />;
}

export default function App() {
  return (
    // The outer safety net: a crash outside the shell (login, the public form) still gets a message.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Open to anyone, no login: */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            {/* Everything inside AppShell needs a login: */}
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/apps" element={<AppsPage />} />
              {modules.map((m) => (
                <Route key={m.name} path={`/${m.name}`} element={<OnlyFor roles={m.roles}><m.page /></OnlyFor>} />
              ))}
              {/* Any other address: */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
