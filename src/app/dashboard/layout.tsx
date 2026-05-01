import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Onboarding redirect lives in `requireOnboarded()` (src/lib/onboarding.ts)
  // and is called from individual dashboard pages — putting it in the layout
  // races the welcome page itself and creates a redirect loop. Layouts must
  // remain idempotent across all child paths (including /dashboard/welcome).
  return (
    // h-[100dvh] (dynamic viewport) instead of h-screen so the layout
    // doesn't extend below the iOS keyboard when an input is focused.
    // pb on main reserves room for the mobile bottom nav AND the home
    // indicator on notched phones (env(safe-area-inset-bottom)).
    <div className="h-[100dvh] bg-background flex overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 h-full pt-[48px] pb-[calc(56px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0 overflow-hidden">{children}</main>
    </div>
  );
}
