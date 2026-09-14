import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    return {
      user: {
        id: "usr-admin-1",
        email: "admin@banadironline.com",
        user_metadata: { full_name: "Ahmed Nor (Owner & Admin)" },
      },
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  );
}
