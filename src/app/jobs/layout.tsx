import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

// `/jobs` is the public job board — open to verified creators (and admins).
// Wrapping it in the same shell as `/dashboard/*` so the left rail stays
// visible when someone navigates from /dashboard → /jobs and back, instead
// of the route looking like a different product.
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 h-full pt-[48px] pb-[56px] md:pt-0 md:pb-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
