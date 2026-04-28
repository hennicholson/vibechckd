"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Choice = "client" | "creator" | "browse";

interface Props {
  defaultName: string | null;
}

export default function WhopStartCard({ defaultName }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(choice: Choice) {
    setError(null);
    setSubmitting(choice);
    const res = await fetch("/api/whop/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitting(null);
      setError(data?.error || "Something went wrong, try again.");
      return;
    }
    const data = (await res.json()) as { next: string };
    router.push(data.next);
    router.refresh();
  }

  const firstName = defaultName ? defaultName.split(" ")[0] : null;

  return (
    <main className="min-h-full flex items-start justify-center bg-background-alt px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Welcome
          </p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em] mb-2">
            {firstName ? `Hey ${firstName}` : "Welcome to vibechckd"}
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            What brings you here?
          </p>
        </div>

        <div className="space-y-2.5">
          <Card
            disabled={submitting !== null}
            loading={submitting === "client"}
            onClick={() => pick("client")}
            title="I'm hiring coders"
            description="Browse vetted talent, build a team, ship a project"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            }
          />
          <Card
            disabled={submitting !== null}
            loading={submitting === "creator"}
            onClick={() => pick("creator")}
            title="I'm a creator"
            description="Get verified, showcase your work, get hired"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            }
          />
          <Card
            disabled={submitting !== null}
            loading={submitting === "browse"}
            onClick={() => pick("browse")}
            title="Just looking around"
            description="Explore the gallery without committing yet"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            }
          />
        </div>

        {error && <p className="text-[12px] text-negative font-mono mt-4 text-center">{error}</p>}

        <p className="text-[11px] text-text-muted text-center mt-6">
          You can change this any time from settings.
        </p>
      </div>
    </main>
  );
}

function Card({
  disabled,
  loading,
  onClick,
  title,
  description,
  icon,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {icon}
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">{title}</p>
            <p className="text-[12px] text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-text-primary border-t-transparent border-r-transparent animate-spin flex-shrink-0" />
        ) : (
          <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
