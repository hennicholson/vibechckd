import VerifiedSeal from "@/components/VerifiedSeal";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-semibold text-text-primary">vibechckd</span>
            <VerifiedSeal size="sm" />
          </div>
          <span className="text-[11px] text-text-muted mt-1">The vetted coder marketplace</span>
        </div>
        <div className="border border-border rounded-[10px] p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
