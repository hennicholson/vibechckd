import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 h-full pt-[48px] pb-[56px] md:pt-0 md:pb-0 overflow-hidden">{children}</main>
    </div>
  );
}
