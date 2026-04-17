"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompanyStage = "idea" | "startup" | "growing" | "established" | "enterprise";

type CompanyData = {
  displayName: string;
  email: string;
  companyName: string;
  companyStage: CompanyStage | "";
  industry: string;
  website: string;
  description: string;
  projectTypes: string[];
  budgetRange: string;
  teamSize: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPANY_STAGES: { value: CompanyStage; label: string; desc: string }[] = [
  { value: "idea", label: "Idea", desc: "Just getting started with a concept" },
  { value: "startup", label: "Startup", desc: "Building an MVP or early product" },
  { value: "growing", label: "Growing", desc: "Product-market fit, scaling up" },
  { value: "established", label: "Established", desc: "Proven business, mature product" },
  { value: "enterprise", label: "Enterprise", desc: "Large organization, complex needs" },
];

const PROJECT_TYPES = [
  "Website",
  "Web App",
  "Mobile App",
  "Design System",
  "E-commerce",
  "SaaS",
  "API / Backend",
  "Other",
];

const BUDGET_RANGES = ["< $5k", "$5k - $15k", "$15k - $50k", "$50k+"];

const TEAM_SIZES = ["Just me", "2-5", "6-15", "16-50", "50+"];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "E-commerce",
  "Media",
  "Real Estate",
  "Gaming",
  "Social",
  "Other",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function buildFormState(data?: Partial<CompanyData> | null): CompanyData {
  return {
    displayName: data?.displayName ?? "",
    email: data?.email ?? "",
    companyName: data?.companyName ?? "",
    companyStage: (data?.companyStage as CompanyStage) ?? "",
    industry: data?.industry ?? "",
    website: data?.website ?? "",
    description: data?.description ?? "",
    projectTypes: data?.projectTypes ?? [],
    budgetRange: data?.budgetRange ?? "",
    teamSize: data?.teamSize ?? "",
  };
}

function calcCompletion(data: CompanyData): number {
  const fields = [
    !!data.companyName,
    !!data.companyStage,
    !!data.description,
    data.projectTypes.length > 0,
    !!data.industry,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export default function CompanyPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [initialData, setInitialData] = useState<CompanyData | null>(null);
  const [form, setForm] = useState<CompanyData>(buildFormState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/client-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const state = buildFormState(data);
          setInitialData(state);
          setForm(state);
        }
      })
      .catch((err) => console.error("Failed to load company profile:", err))
      .finally(() => setLoading(false));
  }, []);

  const initialSnapshot = useMemo(() => JSON.stringify(buildFormState(initialData)), [initialData]);
  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot]);

  const update = useCallback(<K extends keyof CompanyData>(field: K, value: CompanyData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleProjectType = (t: string) => {
    setForm((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(t)
        ? prev.projectTypes.filter((x) => x !== t)
        : [...prev.projectTypes, t],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/client-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setInitialData({ ...form });
      toast("Company profile saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(buildFormState(initialData));
    toast("Changes discarded", "info");
  };

  const completion = calcCompletion(form);

  if (loading) {
    return (
      <div className="max-w-2xl px-4 md:px-8 py-6">
        <div className="h-6 w-40 bg-surface-muted rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-muted rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Company Profile</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Tell creators about your brand and what you're building</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              className="px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Completion bar */}
      {completion < 100 && (
        <div className="border border-border rounded-[10px] p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-primary">Profile completeness</span>
            <span className="text-[11px] font-mono text-text-muted">{completion}%</span>
          </div>
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-text-primary rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}

      {/* Company Name */}
      <div className="space-y-6">
        <div className="border border-border rounded-[10px] p-5">
          <h2 className="text-[14px] font-medium text-text-primary mb-4">About your company</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">Company / Brand name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Acme Inc."
                className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">Your name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                placeholder="Your full name"
                className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">About</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What does your company do? What are you building?"
                rows={3}
                className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none resize-none focus:border-border-hover transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Company Stage */}
        <div className="border border-border rounded-[10px] p-5">
          <h2 className="text-[14px] font-medium text-text-primary mb-1">Company stage</h2>
          <p className="text-[12px] text-text-muted mb-4">Where is your company in its journey?</p>

          <div className="grid grid-cols-1 gap-2">
            {COMPANY_STAGES.map((stage) => (
              <button
                key={stage.value}
                onClick={() => update("companyStage", form.companyStage === stage.value ? "" : stage.value)}
                className={`text-left px-4 py-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                  form.companyStage === stage.value
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-border hover:border-border-hover"
                }`}
              >
                <p className={`text-[13px] font-medium ${form.companyStage === stage.value ? "text-white" : "text-text-primary"}`}>
                  {stage.label}
                </p>
                <p className={`text-[11px] mt-0.5 ${form.companyStage === stage.value ? "text-white/70" : "text-text-muted"}`}>
                  {stage.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div className="border border-border rounded-[10px] p-5">
          <h2 className="text-[14px] font-medium text-text-primary mb-1">Industry</h2>
          <p className="text-[12px] text-text-muted mb-4">What space does your company operate in?</p>

          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                onClick={() => update("industry", form.industry === ind ? "" : ind)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                  form.industry === ind
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-border text-text-secondary hover:border-border-hover"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* What they build */}
        <div className="border border-border rounded-[10px] p-5">
          <h2 className="text-[14px] font-medium text-text-primary mb-1">What are you building?</h2>
          <p className="text-[12px] text-text-muted mb-4">Select all that apply</p>

          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleProjectType(t.toLowerCase().replace(/ /g, "-"))}
                className={`px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors cursor-pointer ${
                  form.projectTypes.includes(t.toLowerCase().replace(/ /g, "-"))
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-border text-text-secondary hover:border-border-hover"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Budget & Team */}
        <div className="border border-border rounded-[10px] p-5">
          <h2 className="text-[14px] font-medium text-text-primary mb-4">Budget & team</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-2">Typical project budget</label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b}
                    onClick={() => update("budgetRange", form.budgetRange === b ? "" : b)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                      form.budgetRange === b
                        ? "border-[#171717] bg-[#171717] text-white"
                        : "border-border text-text-secondary hover:border-border-hover"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-2">Your team size</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => update("teamSize", form.teamSize === s ? "" : s)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                      form.teamSize === s
                        ? "border-[#171717] bg-[#171717] text-white"
                        : "border-border text-text-secondary hover:border-border-hover"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky save bar */}
        {isDirty && (
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border -mx-8 px-4 md:px-8 py-3 flex items-center justify-between">
            <span className="text-[12px] text-text-muted">Unsaved changes</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
