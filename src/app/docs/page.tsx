"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";

const tocSections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "for-creators", label: "For Creators" },
  { id: "for-clients", label: "For Clients" },
  { id: "vetting-process", label: "Vetting Process" },
  { id: "team-builder", label: "Team Builder" },
  { id: "project-management", label: "Project Management" },
  { id: "portfolio", label: "Portfolio" },
  { id: "chat-communication", label: "Chat & Communication" },
  { id: "billing", label: "Billing & Payments" },
  { id: "faq", label: "FAQ" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12px] bg-surface-muted px-1.5 py-0.5 rounded text-text-primary">
      {children}
    </code>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const section of tocSections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <PageShell>
      <div className="max-w-[960px] mx-auto px-6 py-12 flex gap-16">
        {/* Mobile TOC */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="w-10 h-10 rounded-full bg-[#171717] text-[#fafafa] shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-pointer"
            aria-label="Table of contents"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {mobileTocOpen && (
            <div className="absolute bottom-12 right-0 w-[220px] bg-background border border-border rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3">
              <p className="text-[12px] font-semibold text-text-primary tracking-[-0.02em] mb-2">
                On this page
              </p>
              <nav className="flex flex-col gap-0.5">
                {tocSections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMobileTocOpen(false)}
                    className={`text-[13px] py-1 transition-colors duration-150 ${
                      activeSection === s.id
                        ? "text-text-primary font-medium"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0">
          <div className="sticky top-[72px]">
            <p className="text-[13px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Documentation
            </p>
            <nav className="flex flex-col gap-1">
              {tocSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`text-[13px] py-1 transition-colors duration-150 ${
                    activeSection === s.id
                      ? "text-text-primary font-medium"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold text-text-primary tracking-[-0.03em] mb-2">
            Documentation
          </h1>
          <p className="text-[14px] text-text-muted mb-12 max-w-[600px]">
            Everything you need to know about using vibechckd as a creator or client.
          </p>

          {/* Getting Started */}
          <section id="getting-started">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Getting Started
            </h2>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-4">
              vibechckd is a vetted marketplace connecting verified vibe coders with clients who value quality. Every creator on the platform has been reviewed and approved, so clients can trust the talent they hire.
            </p>
            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              How to sign up
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              There are two paths depending on your role:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-4">
              <li>
                <span className="font-medium text-text-primary">Creators</span> apply through the vetting process. Click <Code>Apply</Code> in the navigation to submit your portfolio for review.
              </li>
              <li>
                <span className="font-medium text-text-primary">Clients</span> sign up directly and can immediately browse the gallery and assemble teams.
              </li>
            </ul>
            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              What makes vibechckd different
            </h3>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px]">
              <li>
                <span className="font-medium text-text-primary">Vetted talent only</span> -- every creator passes a quality review before appearing on the platform.
              </li>
              <li>
                <span className="font-medium text-text-primary">No bidding wars</span> -- creators set their own rates. Clients browse and choose based on quality, not price competition.
              </li>
              <li>
                <span className="font-medium text-text-primary">Quality-first</span> -- the platform prioritizes design taste, code standards, and reliability over volume.
              </li>
            </ul>
          </section>

          {/* For Creators */}
          <section id="for-creators" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              For Creators
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Application process
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Getting on vibechckd starts with an application. The process is straightforward:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Submit your portfolio with links to your best work.</li>
              <li>Your submission goes through an AI-assisted review that evaluates portfolio quality, code standards, and design taste.</li>
              <li>You will be notified of approval or rejection. Approved creators receive a verified badge and appear in the gallery.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Setting up your profile
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Once approved, configure your profile from the dashboard:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Name and bio</span> -- introduce yourself and your expertise.</li>
              <li><span className="font-medium text-text-primary">Specialties</span> -- select from Frontend, Backend, Security, Automation, or Full Stack.</li>
              <li><span className="font-medium text-text-primary">Rate</span> -- set your hourly or project rate. This is displayed on your public profile.</li>
              <li><span className="font-medium text-text-primary">Social links</span> -- connect your GitHub, Twitter/X, portfolio site, or other profiles.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Managing your portfolio
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Your portfolio is the primary way clients evaluate your work. Navigate to <Code>Dashboard &gt; Portfolio</Code> to manage it:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Add projects with titles, descriptions, and multiple asset types (images, PDFs, live previews).</li>
              <li>Reorder portfolio items by dragging to highlight your strongest work first.</li>
              <li>Each project can include multiple assets for a comprehensive showcase.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              The verified badge
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Approved creators receive a verified badge displayed next to their name across the platform. This badge signals to clients that the creator has passed the vetting process and meets vibechckd quality standards.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Getting discovered
            </h3>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Your profile appears in the public gallery once approved.</li>
              <li>Clients can find you through search, specialty filters, and browsing.</li>
              <li>A strong portfolio and complete profile improve visibility.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Availability settings
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Control how clients see your availability from your dashboard:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px]">
              <li><span className="font-medium text-text-primary">Available</span> -- actively taking on new projects.</li>
              <li><span className="font-medium text-text-primary">Selective</span> -- open to the right opportunities but not actively seeking.</li>
              <li><span className="font-medium text-text-primary">Unavailable</span> -- not accepting new work at this time.</li>
            </ul>
          </section>

          {/* For Clients */}
          <section id="for-clients" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              For Clients
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Browsing the gallery
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              The gallery is your starting point for finding talent. Every creator listed has been vetted and approved.
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Use specialty filters to narrow results by expertise (Frontend, Backend, Security, etc.).</li>
              <li>Search by name or keyword to find specific creators.</li>
              <li>Click any profile card to view their full portfolio, bio, rate, and availability.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Building a team
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              vibechckd lets you assemble a team of creators organized by specialty:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Navigate to <Code>Build a Team</Code> from the navigation.</li>
              <li>Select creators for each role slot (Frontend, Backend, Security).</li>
              <li>Review your assembled team before initiating a project.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Initiating a project
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Once your team is assembled, you can kick off a project directly from the team builder. This creates a project dashboard where you can manage tasks, deliverables, and communication.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Managing projects
            </h3>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px]">
              <li>Track tasks and their statuses from a centralized dashboard.</li>
              <li>Review and approve deliverables submitted by your team.</li>
              <li>Communicate with your team through in-platform chat.</li>
            </ul>
          </section>

          {/* Vetting Process */}
          <section id="vetting-process" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Vetting Process
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              What we evaluate
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Every application is reviewed against four criteria:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Portfolio quality</span> -- the overall caliber and presentation of submitted work.</li>
              <li><span className="font-medium text-text-primary">Code standards</span> -- clean, maintainable, and well-structured code.</li>
              <li><span className="font-medium text-text-primary">Design taste</span> -- visual sensibility, attention to detail, and polish.</li>
              <li><span className="font-medium text-text-primary">Reliability</span> -- track record of delivering quality work consistently.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              AI-assisted scoring
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Applications are evaluated with the help of AI scoring to ensure consistent, objective assessments across all submissions. This assists human reviewers in making final decisions.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Review timeline
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Expect a decision within <span className="font-medium text-text-primary">3-5 business days</span> of submitting your application. You will be notified by email.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              The verified badge
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Approved creators receive a verified badge that appears next to their name on profile cards, the gallery, and within projects. It is a signal of trust and quality to clients.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Maintaining verification
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              Verification is not permanent without standards. Creators are expected to maintain the quality that earned their badge. Client feedback and ongoing work quality contribute to continued verification status.
            </p>
          </section>

          {/* Team Builder */}
          <section id="team-builder" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Team Builder
            </h2>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-4">
              The Team Builder lets clients assemble a project team from vetted creators, organized by specialty.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              How to assemble a team
            </h3>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Navigate to <Code>Build a Team</Code> from the main navigation.</li>
              <li>The builder presents role slots: <span className="font-medium text-text-primary">Frontend</span>, <span className="font-medium text-text-primary">Backend</span>, and <span className="font-medium text-text-primary">Security</span>.</li>
              <li>Browse filtered galleries for each slot and select creators.</li>
              <li>Review your assembled roster before launching the project.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Initiating a project from your team
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              Once all desired slots are filled, you can create a project directly from the team builder. This populates the project dashboard with your selected team members and their assigned roles.
            </p>
          </section>

          {/* Project Management */}
          <section id="project-management" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Project Management
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Project dashboard
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Each project has a dedicated dashboard that serves as the central hub for all activity. From here you can view your team, manage tasks, review deliverables, and communicate.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Tasks
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Tasks are the building blocks of project work:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Create</span> tasks with clear descriptions and assign them to team members.</li>
              <li><span className="font-medium text-text-primary">Track status</span> through three stages: To Do, In Progress, and Done.</li>
              <li>Both clients and creators can update task statuses as work progresses.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Deliverables
            </h3>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Creators submit deliverables for client review.</li>
              <li>Clients can review, provide feedback, and approve deliverables.</li>
              <li>All deliverable history is tracked within the project.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Team roster and roles
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              The project dashboard displays all team members with their assigned roles and specialties. This provides a clear overview of who is responsible for what.
            </p>
          </section>

          {/* Portfolio */}
          <section id="portfolio" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Portfolio
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Adding portfolio items
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Navigate to <Code>Dashboard &gt; Portfolio</Code> to add and manage your work. Each portfolio item includes a title, description, and one or more assets.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Asset types
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Portfolio items support multiple asset types to showcase your work effectively:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">PDF</span> -- upload design documents, case studies, or presentations.</li>
              <li><span className="font-medium text-text-primary">Image</span> -- screenshots, mockups, or visual designs.</li>
              <li><span className="font-medium text-text-primary">Video</span> -- demos, walkthroughs, or recorded presentations.</li>
              <li><span className="font-medium text-text-primary">Live Preview</span> -- embed a live URL that renders as an interactive iframe.</li>
              <li><span className="font-medium text-text-primary">Figma</span> -- embed Figma files directly in your portfolio.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Live preview iframes
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              When you add a Live Preview asset, the URL is rendered in an iframe on your public profile. This lets clients interact with your work directly without leaving the platform.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Portfolio ordering
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              Drag and drop portfolio items to reorder them. Your strongest work should appear first, as this is what clients see when they visit your profile.
            </p>
          </section>

          {/* Chat & Communication */}
          <section id="chat-communication" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Chat & Communication
            </h2>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              In-platform messaging
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Every project includes a built-in chat for team communication. Messages are scoped to the project, keeping conversations organized and relevant. The chat auto-polls for new messages so conversations stay up to date in real-time.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Quick actions
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              The chat includes quick action buttons that let you take action without leaving the conversation:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Invoice</span> -- create and send invoices with optional split billing and email delivery.</li>
              <li><span className="font-medium text-text-primary">Proposal</span> -- send a structured project proposal with scope, budget, and timeline. The other party can accept directly from the chat.</li>
              <li><span className="font-medium text-text-primary">Milestone</span> -- define project milestones with linked payments and tasks for structured delivery.</li>
              <li><span className="font-medium text-text-primary">Task</span> -- create and assign tasks to team members without switching tabs.</li>
              <li><span className="font-medium text-text-primary">Payment</span> -- send a direct one-time payment to a team member with a secure checkout link.</li>
              <li><span className="font-medium text-text-primary">Files</span> -- upload and share files (images, PDFs, videos) directly in the conversation.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Structured messages
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Invoices, proposals, milestones, and payments render as rich cards within the chat rather than plain text. These cards include actionable elements like "Pay now" buttons, "Accept proposal" confirmations, and real-time status indicators.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              File sharing
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              Share files directly within project conversations. Images display inline thumbnails, and all files are hosted on a CDN for fast delivery.
            </p>
          </section>

          {/* Billing */}
          <section id="billing" className="border-t border-border pt-8 mt-8">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-4">
              Billing & Payments
            </h2>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              vibechckd uses Whop Payments to handle all financial transactions on the platform. Payments are secure, tracked in real-time, and support multiple payout methods.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Invoices
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Creators can send invoices directly from the project chat using the Invoice quick action:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Create an invoice</span> with a description, amount, and optional due date.</li>
              <li><span className="font-medium text-text-primary">Send to a specific email</span> using the advanced options, or let the platform auto-detect the recipient from project members.</li>
              <li><span className="font-medium text-text-primary">Split invoices</span> between multiple team members for shared projects.</li>
              <li><span className="font-medium text-text-primary">Check payment status</span> in real-time -- the platform polls Whop to verify if an invoice has been paid.</li>
              <li><span className="font-medium text-text-primary">Resend invoice emails</span> directly from the chat if a client hasn't received the payment link.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Direct payments
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Clients can send one-time payments to creators without creating a formal invoice:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>Use the <span className="font-medium text-text-primary">Payment</span> quick action in the project chat.</li>
              <li>Enter an amount and optional description -- a secure checkout link is generated instantly.</li>
              <li>Payment status is tracked automatically and updates in the chat when completed.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Project balance
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Every project displays a live financial summary at the top of the chat, showing total invoiced, paid, pending, and overdue amounts. This gives both clients and creators a clear picture of the project's financial status at a glance.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Milestones
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-6">
              Use the Milestone quick action to create project milestones with attached payment amounts. Each milestone automatically creates a linked task and invoice, tying deliverables to payment stages for structured project billing.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Earnings & withdrawals
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Creators have a dedicated <Code>Earnings</Code> page in the dashboard to manage their income:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li><span className="font-medium text-text-primary">Available balance</span> -- funds ready to withdraw from completed payments.</li>
              <li><span className="font-medium text-text-primary">Pending balance</span> -- payments that have been initiated but not yet confirmed.</li>
              <li><span className="font-medium text-text-primary">Transaction history</span> -- a full record of all income, payments, and withdrawals with filtering by type.</li>
              <li><span className="font-medium text-text-primary">Withdraw</span> -- cash out your balance to your connected payout method at any time.</li>
            </ul>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2">
              Payout methods
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px] mb-3">
              Withdrawals are processed through Whop Payments, which supports:
            </p>
            <ul className="text-[13px] text-text-secondary leading-[1.7] pl-4 list-disc space-y-1.5 max-w-[600px] mb-6">
              <li>ACH bank deposit (US)</li>
              <li>International bank transfer (241+ territories)</li>
              <li>Venmo</li>
              <li>CashApp</li>
              <li>Cryptocurrency</li>
            </ul>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              Processing time varies by method, typically 1-3 business days for bank transfers.
            </p>

            <h3 className="text-[15px] font-semibold text-text-primary mb-2 mt-6">
              Payment security
            </h3>
            <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[600px]">
              All payment processing is handled by Whop, which supports credit and debit cards, digital wallets, crypto, and Buy Now Pay Later options across 195 countries. Webhook events are verified using HMAC-SHA256 signature validation with replay protection.
            </p>
          </section>

          {/* FAQ */}
          <section id="faq" className="border-t border-border pt-8 mt-8 mb-16">
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] mb-6">
              FAQ
            </h2>
            <div className="space-y-6 max-w-[600px]">
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  How long does vetting take?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  Applications are reviewed within 3-5 business days. You will receive an email notification with the outcome.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  Can I be both a client and a coder?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  Yes. You can switch between client and creator roles within the platform. Your profile and capabilities adjust based on your active role.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  What specialties are supported?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  vibechckd currently supports five specialties: Frontend, Backend, Security, Automation, and Full Stack. More may be added in the future.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  How do I update my rate?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  Navigate to <Code>Dashboard</Code> then <Code>Profile</Code> and update the Rate field. Changes are reflected immediately on your public profile.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  How do payments work?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  All payments are processed through Whop Payments. Clients can pay via invoices or direct payments from the project chat. Creators receive funds in their platform balance and can withdraw to their bank account, Venmo, CashApp, or crypto at any time.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  How do I withdraw my earnings?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  Navigate to <Code>Dashboard</Code> then <Code>Earnings</Code> and click the Withdraw button. Enter the amount you'd like to cash out and the funds will be sent to your connected payout method. Withdrawals typically process within 1-3 business days.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-1">
                  Is there a platform fee?
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.7]">
                  Standard payment processing fees apply through Whop. There are no additional platform fees at this time.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
