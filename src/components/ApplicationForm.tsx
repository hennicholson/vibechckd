"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "./Input";
import Textarea from "./Textarea";
import Button from "./Button";
import FileUpload from "./FileUpload";
import ProgressIndicator from "./ProgressIndicator";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";

const STEPS = ["Basics", "Specialties", "Portfolio", "About You", "Review"];

type FormData = {
  name: string;
  email: string;
  location: string;
  specialties: Specialty[];
  portfolioLinks: string[];
  portfolioLinkInput: string;
  rateExpectation: string;
  pitch: string;
};

const initialFormData: FormData = {
  name: "",
  email: "",
  location: "",
  specialties: [],
  portfolioLinks: [],
  portfolioLinkInput: "",
  rateExpectation: "",
  pitch: "",
};

export default function ApplicationForm({ initialName, initialEmail }: { initialName?: string; initialEmail?: string } = {}) {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    ...initialFormData,
    name: initialName || "",
    email: initialEmail || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);

  const update = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialty = (s: Specialty) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const addLink = () => {
    if (form.portfolioLinkInput.trim()) {
      update("portfolioLinks", [...form.portfolioLinks, form.portfolioLinkInput.trim()]);
      update("portfolioLinkInput", "");
    }
  };

  const removeLink = (i: number) => {
    update("portfolioLinks", form.portfolioLinks.filter((_, j) => j !== i));
  };

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [stepError, setStepError] = useState("");

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!form.name.trim()) { setStepError("Name is required."); return false; }
      if (!form.email.trim()) { setStepError("Email is required."); return false; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) { setStepError("Please enter a valid email."); return false; }
    }
    if (step === 2 && form.specialties.length === 0) {
      setStepError("Select at least one specialty.");
      return false;
    }
    if (step === 3 && form.portfolioLinks.length === 0) {
      setStepError("Add at least one portfolio link.");
      return false;
    }
    setStepError("");
    return true;
  };

  const goNext = () => { if (step < 5 && validateStep()) { setDirection(1); setStep(step + 1); } };
  const goBack = () => { if (step > 1) { setStepError(""); setDirection(-1); setStep(step - 1); } };

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || null,
          name: form.name,
          email: form.email,
          location: form.location,
          specialties: form.specialties,
          portfolioLinks: form.portfolioLinks,
          rateExpectation: form.rateExpectation,
          pitch: form.pitch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Application Submitted</h2>
        <p className="text-[14px] text-text-secondary mt-2 max-w-md mx-auto">
          Thanks, {form.name}. We&apos;ll review your application and get back to you within 3-5 business days.
        </p>
      </motion.div>
    );
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
  };

  return (
    <div className="max-w-xl mx-auto">
      <ProgressIndicator currentStep={step} totalSteps={5} labels={STEPS} />

      <div className="mt-10 min-h-[360px]">
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
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-1">Basics</h3>
                <Input label="Full Name" placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
                <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
                <Input label="Location" placeholder="City, Country" value={form.location} onChange={(e) => update("location", e.target.value)} />
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-1">Specialties</h3>
                <p className="text-[13px] text-text-muted mb-5">Select all that apply.</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer border inline-flex items-center gap-1.5 ${
                        form.specialties.includes(s)
                          ? "bg-[#171717] text-[#fafafa] border-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                          : "bg-background text-text-secondary border-border hover:border-border-hover"
                      }`}
                    >
                      {form.specialties.includes(s) && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {SPECIALTY_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-1">Portfolio</h3>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Links</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://github.com/you"
                      value={form.portfolioLinkInput}
                      onChange={(e) => update("portfolioLinkInput", e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                      className="flex-1"
                    />
                    <Button variant="secondary" size="sm" onClick={addLink}>Add</Button>
                  </div>
                  {form.portfolioLinks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {form.portfolioLinks.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md">
                          <span className="text-[12px] text-text-secondary font-mono truncate flex-1">{link}</span>
                          <button onClick={() => removeLink(i)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <FileUpload label="Sample Project" accept=".pdf,.png,.jpg,.gif,.zip" />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-1">About You</h3>
                <Input label="Rate Expectations" placeholder="e.g. $150-250/hr" value={form.rateExpectation} onChange={(e) => update("rateExpectation", e.target.value)} />
                <Textarea
                  label="Why should you be vibechckd?"
                  placeholder="What makes you different?"
                  value={form.pitch}
                  onChange={(e) => update("pitch", e.target.value)}
                  maxChars={1000}
                  currentLength={form.pitch.length}
                />
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-5">Review</h3>
                <div className="space-y-0 border border-border rounded-[10px] overflow-hidden">
                  <ReviewField label="Name" value={form.name} onEdit={() => { setDirection(-1); setStep(1); }} />
                  <ReviewField label="Email" value={form.email} onEdit={() => { setDirection(-1); setStep(1); }} />
                  <ReviewField label="Location" value={form.location} onEdit={() => { setDirection(-1); setStep(1); }} />
                  <ReviewField label="Specialties" value={form.specialties.map((s) => SPECIALTY_LABELS[s]).join(", ")} onEdit={() => { setDirection(-1); setStep(2); }} />
                  <ReviewField label="Links" value={form.portfolioLinks.join(", ") || "None"} onEdit={() => { setDirection(-1); setStep(3); }} />
                  <ReviewField label="Rate" value={form.rateExpectation} onEdit={() => { setDirection(-1); setStep(4); }} />
                  <ReviewField label="Pitch" value={form.pitch} onEdit={() => { setDirection(-1); setStep(4); }} last />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {(submitError || stepError) && (
        <p className="text-[12px] text-negative text-center mt-4">{submitError || stepError}</p>
      )}

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={goBack} disabled={step === 1}>Back</Button>
        {step < 5 ? (
          <Button onClick={goNext}>Continue</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewField({ label, value, onEdit, last = false }: { label: string; value: string; onEdit: () => void; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-3.5 py-3 ${!last ? "border-b border-surface-muted" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-text-muted font-mono uppercase tracking-[0.06em] mb-0.5">{label}</p>
        <p className="text-[13px] text-text-primary break-words">{value || <span className="text-text-muted italic">Not provided</span>}</p>
      </div>
      <button onClick={onEdit} className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer flex-shrink-0">
        Edit
      </button>
    </div>
  );
}
