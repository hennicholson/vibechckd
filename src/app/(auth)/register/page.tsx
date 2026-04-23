"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Button from "@/components/Button";

type Role = "coder" | "client";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) || null;

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
        setError(data.error || "Something went wrong");
        return;
      }

      // Do NOT auto-signIn — the account starts unverified. Send the user to
      // the verify-email landing page which shows "check your inbox".
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
  };

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
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Choose role */}
          {step === 1 && (
            <div>
              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Join vibechckd
              </h1>
              <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
                How will you use the platform?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => selectRole("client")}
                  className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">I&apos;m looking for coders</p>
                        <p className="text-[12px] text-text-muted mt-0.5">Browse vetted talent, build teams, ship projects</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => selectRole("coder")}
                  className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">I&apos;m applying as a creator</p>
                        <p className="text-[12px] text-text-muted mt-0.5">Get verified, showcase your portfolio, get hired</p>
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

          {/* Step 2: Account info */}
          {step === 2 && (
            <div>
              <button onClick={() => { setRole(null); setDirection(-1); setStep(1); }} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Create your account
              </h1>
              <p className="text-[11px] text-text-muted text-center mt-1 mb-6">
                Step 1 of 3 — Account details
              </p>

              <div className="space-y-4">
                <Input label="Full name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button onClick={goNext} className="w-full" disabled={!name || !email || !password || password.length < 8}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Onboarding — Client */}
          {step === 3 && role === "client" && (
            <div>
              <button onClick={goBack} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Tell us about your project
              </h1>
              <p className="text-[11px] text-text-muted text-center mt-1 mb-6">
                Step 2 of 3 — This helps us match you with the right coders
              </p>

              <div className="space-y-4">
                <Input label="Company / Brand name" placeholder="Acme Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">What are you building?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Website", "Web app", "Mobile app", "Design system", "E-commerce", "Other"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setProjectType(t)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                          projectType === t ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Budget range</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["< $5k", "$5k - $15k", "$15k - $50k", "$50k+"].map((b) => (
                      <button
                        key={b}
                        onClick={() => setBudget(b)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                          budget === b ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Timeline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["< 2 weeks", "1 month", "2-3 months", "Ongoing"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeline(t)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                          timeline === t ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={goNext} className="w-full">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 3: Onboarding — Creator */}
          {step === 3 && role === "coder" && (
            <div>
              <button onClick={goBack} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Tell us about your work
              </h1>
              <p className="text-[11px] text-text-muted text-center mt-1 mb-6">
                Step 2 of 3 — You&apos;ll complete the full vetting application after signup
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Specialties</label>
                  <div className="flex flex-wrap gap-2">
                    {["Frontend", "Backend", "Full Stack", "Security", "Automation"].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s.toLowerCase().replace(" ", "-"))}
                        className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                          specialties.includes(s.toLowerCase().replace(" ", "-")) ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Portfolio or website URL" placeholder="https://yoursite.com" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Experience level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["1-3 years", "3-7 years", "7+ years"].map((e) => (
                      <button
                        key={e}
                        onClick={() => setExperience(e)}
                        className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
                          experience === e ? "bg-[#171717] text-[#fafafa] border-[#171717]" : "border-border text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={goNext} className="w-full">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 4: Final — project description (client) or confirmation (coder) */}
          {step === 4 && role === "client" && (
            <div>
              <button onClick={goBack} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Describe your project
              </h1>
              <p className="text-[11px] text-text-muted text-center mt-1 mb-6">
                Step 3 of 3 — Optional, but helps us recommend the right coders
              </p>

              <div className="space-y-4">
                <Textarea
                  label="Project description"
                  placeholder="Tell us what you're building, the problems you're solving, and what kind of talent you need..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  maxChars={500}
                  currentLength={projectDescription.length}
                />
                {error && <p className="text-[12px] text-negative">{error}</p>}
                <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
                <button onClick={handleSubmit} disabled={loading} className="w-full text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer text-center disabled:opacity-50 disabled:pointer-events-none">
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Final — confirmation (coder) */}
          {step === 4 && role === "coder" && (
            <div>
              <button onClick={goBack} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em] text-center">
                Ready to apply
              </h1>
              <p className="text-[11px] text-text-muted text-center mt-1 mb-6">
                Step 3 of 3 — Create your account to start the vetting process
              </p>

              <div className="border border-border rounded-[10px] p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-text-muted">Name</span>
                    <span className="text-[12px] text-text-primary">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-text-muted">Email</span>
                    <span className="text-[12px] text-text-primary">{email}</span>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-text-muted">Specialties</span>
                      <span className="text-[12px] text-text-primary">{specialties.join(", ")}</span>
                    </div>
                  )}
                  {portfolioUrl && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-text-muted">Portfolio</span>
                      <span className="text-[12px] text-text-primary truncate ml-4">{portfolioUrl}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-text-muted mb-4 text-center">
                After signup, you&apos;ll complete the full vetting application with portfolio uploads, work samples, and more.
              </p>

              {error && <p className="text-[12px] text-negative mb-3">{error}</p>}
              <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account & apply"}
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
