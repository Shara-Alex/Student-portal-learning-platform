import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { ApplyPage } from "./modules/admissions/ApplyPage";
import { AppsPage } from "./modules/core/AppsPage";
import { HomePage } from "./modules/core/HomePage";
import { LoginPage } from "./modules/core/LoginPage";
import { modules } from "./modules/registry";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function App() {
  return (
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
              <Route key={m.name} path={`/${m.name}`} element={<m.page />} />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
