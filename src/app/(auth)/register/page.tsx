"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Button from "@/components/Button";
import { useToast, failed } from "@/components/Toast";

type Role = "coder" | "client";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) || null;
  const { toast } = useToast();

  const [step, setStep] = useState(defaultRole ? 2 : 1);
  const [role, setRole] = useState<Role | null>(defaultRole);
  const [direction, setDirection] = useState(1);

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Client onboarding fields
  const [companyName, setCompanyName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Creator onboarding fields
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => { setDirection(1); setStep(step + 1); };
  const goBack = () => { setDirection(-1); setStep(step - 1); };

  const selectRole = (r: Role) => {
    setRole(r);
    setDirection(1);
    setStep(2);
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  async function handleSubmit() {
    if (!role || loading) return;
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: role === "client" ? (companyName || name) : name,
          email: normalizedEmail,
          password,
          role,
          onboarding: role === "client"
            ? { companyName, projectType, budget, timeline, projectDescription }
            : { portfolioUrl, specialties, experience },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We hit a snag setting that up.");
        toast(failed("create your account"), "error");
        return;
      }

      // Do NOT auto-signIn — the account starts unverified. Send the user to
      // the verify-email landing page which shows "check your inbox".
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch {
      setError("Connection hiccup. Try again.");
      toast(failed("create your account"), "error");
    } finally {
      setLoading(false);
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
  };

  // Step ribbon for steps 2-4 — communicates progress without the heavy
  // dashboard ProgressIndicator. Each segment fills as the user moves
  // forward; the active one breathes a faint pulse.
  const totalSteps = 3;
  const currentStep = step - 1; // step 2 → 1, step 3 → 2, step 4 → 3

  return (
    <div>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Step 1: Choose role */}
          {step === 1 && (
            <div>
              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Join vibechckd
              </h1>
              <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
                Two doors in. Pick yours.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => selectRole("client")}
                  className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group min-h-[64px]"
                  aria-label="Sign up as a client"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">I&apos;m hiring</p>
                        <p className="text-[12px] text-text-muted mt-0.5">Find vetted talent, build a team, ship the thing.</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => selectRole("coder")}
                  className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group min-h-[64px]"
                  aria-label="Sign up as a creator"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">I&apos;m a creator</p>
                        <p className="text-[12px] text-text-muted mt-0.5">Get vibechckd. Show the work. Get the work.</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>

              <p className="text-[13px] text-text-muted text-center mt-5">
                Already have an account?{" "}
                <Link href="/login" className="text-text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* Steps 2-4: shared step ribbon at top */}
          {step > 1 && (
            <div className="mb-5">
              <button
                onClick={() => {
                  if (step === 2) { setRole(null); setDirection(-1); setStep(1); }
                  else goBack();
                }}
                className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4"
                aria-label="Back"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep} of ${totalSteps}`}>
                {Array.from({ length: totalSteps }).map((_, i) => {
                  const filled = i < currentStep;
                  const active = i === currentStep - 1;
                  return (
                    <div
                      key={i}
                      className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                        filled ? "bg-text-primary" : active ? "bg-text-primary/40" : "bg-border"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-2">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          )}

          {/* Step 2: Account info */}
          {step === 2 && (
            <div>
              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
                Create your account
              </h1>
              <p className="text-[13px] text-text-muted mt-1 mb-5">
                Name, email, password — the essentials.
              </p>

              <div className="space-y-4">
                <Input label="Full name" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div>
                  <Input label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-[11px] text-text-muted mt-1.5">{8 - password.length} more character{8 - password.length === 1 ? "" : "s"} to go.</p>
                  )}
                </div>
                <Button onClick={goNext} className="w-full min-h-[44px] md:min-h-0" disabled={!name || !email || !password || password.length < 8} size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Onboarding — Client */}
          {step === 3 && role === "client" && (
            <div>
              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                What are we shipping?
              </h1>
              <p className="text-[13px] text-text-muted mt-1 mb-5">
                The basics so we can line up the right creators.
              </p>

              <div className="space-y-4">
                <Input label="Company / brand" autoComplete="organization" placeholder="Acme Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">What kind of build?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Website", "Web app", "Mobile app", "Design system", "E-commerce", "Other"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProjectType(t)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer min-h-[40px] ${
                          projectType === t ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                        aria-pressed={projectType === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Budget range</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["< $5k", "$5k – $15k", "$15k – $50k", "$50k+"].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBudget(b)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer min-h-[40px] ${
                          budget === b ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                        aria-pressed={budget === b}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Timeline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["< 2 weeks", "1 month", "2–3 months", "Ongoing"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTimeline(t)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer min-h-[40px] ${
                          timeline === t ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                        aria-pressed={timeline === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={goNext} className="w-full min-h-[44px] md:min-h-0" size="lg">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 3: Onboarding — Creator */}
          {step === 3 && role === "coder" && (
            <div>
              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                Show us what you do
              </h1>
              <p className="text-[13px] text-text-muted mt-1 mb-5">
                A quick sketch — the full vetting app is next.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Specialties</label>
                  <div className="flex flex-wrap gap-2">
                    {["Frontend", "Backend", "Full Stack", "Security", "Automation"].map((s) => {
                      const slug = s.toLowerCase().replace(" ", "-");
                      const selected = specialties.includes(slug);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSpecialty(slug)}
                          className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors cursor-pointer min-h-[36px] inline-flex items-center gap-1.5 ${
                            selected ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                          }`}
                          aria-pressed={selected}
                        >
                          {selected && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Input label="Portfolio URL" type="url" inputMode="url" autoCapitalize="off" placeholder="https://yoursite.com" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Experience</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["1–3 years", "3–7 years", "7+ years"].map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setExperience(e)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer min-h-[40px] ${
                          experience === e ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                        aria-pressed={experience === e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={goNext} className="w-full min-h-[44px] md:min-h-0" size="lg">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 4: Final — project description (client) */}
          {step === 4 && role === "client" && (
            <div>
              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                Tell us the shape of it
              </h1>
              <p className="text-[13px] text-text-muted mt-1 mb-5">
                Optional — but the more we know, the sharper our matches.
              </p>

              <div className="space-y-4">
                <Textarea
                  label="What are you building?"
                  placeholder="The problem you're solving, the audience, what good looks like — even a paragraph helps."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  maxChars={500}
                  currentLength={projectDescription.length}
                />
                {error && <p className="text-[12px] text-negative" role="alert" aria-live="polite">{error}</p>}
                <Button onClick={handleSubmit} className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={loading}>
                  {loading ? "Creating your account…" : "Create account"}
                </Button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer text-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  Skip — I&apos;ll fill this in later
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Final — confirmation (creator) */}
          {step === 4 && role === "coder" && (
            <div>
              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                Ready when you are
              </h1>
              <p className="text-[13px] text-text-muted mt-1 mb-5">
                Quick look before we ship you into the vetting flow.
              </p>

              <div className="border border-border rounded-[10px] p-4 mb-4 hover:border-border-hover transition-colors">
                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Name</span>
                    <span className="text-[12px] text-text-primary text-right">{name}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Email</span>
                    <span className="text-[12px] text-text-primary text-right truncate">{email}</span>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Specialties</span>
                      <span className="text-[12px] text-text-primary text-right">{specialties.join(", ")}</span>
                    </div>
                  )}
                  {portfolioUrl && (
                    <div className="flex justify-between gap-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Portfolio</span>
                      <span className="text-[12px] text-text-primary text-right truncate ml-4 max-w-[60%]">{portfolioUrl}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-text-muted mb-4 leading-relaxed">
                Next up: portfolio pieces, samples, and a short pitch. The whole thing takes about 5 minutes.
              </p>

              {error && <p className="text-[12px] text-negative mb-3" role="alert" aria-live="polite">{error}</p>}
              <Button onClick={handleSubmit} className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={loading}>
                {loading ? "Creating your account…" : "Create account & apply"}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step > 1 && (
        <p className="text-[13px] text-text-muted text-center mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-text-primary font-medium hover:underline">Sign in</Link>
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
