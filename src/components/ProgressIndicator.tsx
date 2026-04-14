"use client";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export default function ProgressIndicator({ currentStep, totalSteps, labels }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-xl mx-auto">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-medium transition-colors duration-300 ${
                  isCompleted
                    ? "bg-text-primary text-background"
                    : isCurrent
                      ? "border-2 border-text-primary text-text-primary"
                      : "border border-border text-text-muted"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              {labels?.[i] && (
                <span className={`text-[11px] mt-1.5 whitespace-nowrap ${
                  isCurrent ? "text-text-primary font-medium" : isCompleted ? "text-text-primary" : "text-text-muted"
                }`}>
                  {labels[i]}
                </span>
              )}
            </div>

            {step < totalSteps && (
              <div className="flex-1 h-[2px] mx-2 relative rounded-full overflow-hidden">
                <div className={`absolute inset-0 transition-colors duration-300 ${isCompleted ? "bg-text-primary" : "bg-border"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
