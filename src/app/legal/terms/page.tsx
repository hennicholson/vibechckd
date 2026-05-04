import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · vibechckd",
  description:
    "vibechckd's terms of service. We facilitate connections; payments are processed by Whop.",
};

const LAST_UPDATED = "May 3, 2026";

export default function TermsPage() {
  return (
    <PageShell>
      <div className="max-w-[760px] mx-auto px-6 py-12 md:py-16">
        <div className="mb-10">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Legal
          </p>
          <h1 className="text-[28px] md:text-[36px] font-semibold text-text-primary tracking-[-0.02em]">
            Terms of Service
          </h1>
          <p className="text-[12px] text-text-muted mt-2">
            Last updated {LAST_UPDATED}
          </p>
        </div>

        <div className="prose-vibechckd space-y-8 text-[14px] leading-[1.7] text-text-secondary">
          <Section title="1. Who we are">
            <p>
              vibechckd (&quot;<strong>vibechckd</strong>,&quot; &quot;
              <strong>we</strong>,&quot; or &quot;<strong>us</strong>&quot;)
              operates a curated marketplace at <code>vibechckd.cc</code> that
              connects clients with vetted vibe coders for project-based work.
              By using the marketplace, creating an account, or accessing any
              part of the service, you agree to these Terms of Service.
            </p>
            <p>
              These terms supplement (and do not replace) the terms of any
              third-party platform we integrate with — including Whop, where
              payments and creator wallets are operated.
            </p>
          </Section>

          <Section title="2. The role of vibechckd: facilitator only">
            <p>
              vibechckd is a <strong>technology platform that facilitates the
              introduction, communication, and project workflow</strong> between
              independent clients and independent creators. We are not party to
              the agreement between a client and a creator. We do not employ
              creators, do not perform the work, and do not warrant the
              outcome of any project.
            </p>
            <p>
              All freelance services contracted through the marketplace are
              provided by the creator directly. Any dispute over scope,
              quality, timeline, or deliverables is between the client and the
              creator. We may, at our discretion, offer informal mediation
              tooling within the chat surface — that does not make us a party
              to the dispute or an arbiter of its outcome.
            </p>
          </Section>

          <Section title="3. Payments are processed by Whop">
            <p>
              <strong>vibechckd does not process payments.</strong> All
              checkout, payment authorization, settlement, payout, and wallet
              functionality on the marketplace is provided by Whop Inc. and its
              licensed payment processors. When you pay an invoice, send a
              direct payment, or withdraw funds, you are transacting with Whop
              under{" "}
              <a
                href="https://whop.com/legal/terms-of-service/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-primary"
              >
                Whop&apos;s Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://whop.com/legal/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-primary"
              >
                Privacy Policy
              </a>
              .
            </p>
            <p>
              vibechckd never holds funds on your behalf, never has access to
              your full payment-method details, and never moves money outside
              the Whop wallet rails. The vibechckd dashboard reflects the state
              of your Whop balance for convenience; the source of truth is
              always your Whop wallet.
            </p>
          </Section>

          <Section title="4. Refunds, chargebacks, and disputes">
            <p>
              Because all payments flow through Whop, all refund, chargeback,
              and payment-dispute decisions are made by Whop and the relevant
              card networks under their own policies. <strong>vibechckd has
              no authority to issue refunds or reverse payments.</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>To request a refund</strong>, contact the creator
                directly via the project chat. If a refund is agreed, the
                creator can issue it through their Whop wallet, or vibechckd
                can void an unpaid invoice.
              </li>
              <li>
                <strong>Chargebacks initiated through your card issuer or
                bank</strong> are handled entirely by Whop and the card
                network. vibechckd will receive a webhook event and reflect
                the disputed status on the transaction in your dashboard for
                visibility.
              </li>
              <li>
                <strong>If a chargeback is upheld</strong> after the creator
                has already withdrawn funds, the loss is between the
                creator&apos;s Whop wallet and Whop&apos;s recovery
                processes. vibechckd is not financially liable for chargebacks,
                fraud losses, or unrecovered funds, except where required by
                law.
              </li>
              <li>
                You agree not to initiate a chargeback without first attempting
                in good faith to resolve the issue with the creator and, if
                unresolved, with Whop&apos;s payments support.
              </li>
            </ul>
          </Section>

          <Section title="5. Fees">
            <p>
              vibechckd may charge a marketplace facilitation fee on payments
              processed through the platform. The current fee is shown in your
              dashboard prior to confirming any payment or invoice. Whop also
              charges its own processing fees, which are disclosed at
              checkout. We may change our fee with reasonable advance notice.
            </p>
          </Section>

          <Section title="6. Eligibility and accounts">
            <p>
              You must be at least 18 years old (or the age of majority in your
              jurisdiction, whichever is greater) and capable of entering into
              a binding contract. Creators must complete vibechckd&apos;s
              vetting application and Whop&apos;s identity / KYC checks before
              receiving payouts.
            </p>
            <p>
              You are responsible for safeguarding your account credentials.
              Notify us at <a href="mailto:hello@vibechckd.cc" className="underline hover:text-text-primary">hello@vibechckd.cc</a>{" "}
              if you suspect unauthorized access.
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <p>
              You agree not to use vibechckd to: solicit illegal services;
              circumvent the platform to avoid fees once a relationship was
              formed via vibechckd; harass, dox, or threaten any user; submit
              false or misleading information; or scrape, reverse-engineer, or
              attempt to disrupt the service.
            </p>
            <p>
              Direct payments require an active project with both parties as
              members. Unsolicited payments outside a project context are not
              supported.
            </p>
          </Section>

          <Section title="8. Content and intellectual property">
            <p>
              You retain ownership of the content you submit to vibechckd
              (portfolios, project messages, deliverables). You grant
              vibechckd a non-exclusive, worldwide, royalty-free license to
              host and display that content as needed to operate the
              marketplace. You represent that you have the rights to all
              content you submit and that it does not infringe any third-party
              rights.
            </p>
            <p>
              The vibechckd brand, design, and codebase are owned by us and
              are not licensed to you under these terms.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              The service is provided &quot;as is&quot; and &quot;as
              available.&quot; To the fullest extent permitted by law, we
              disclaim all warranties, express or implied, including
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
            <p>
              We do not guarantee uninterrupted or error-free operation, and
              we are not responsible for the actions, content, or quality of
              work delivered by any creator or client.
            </p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>
              To the fullest extent permitted by law, vibechckd&apos;s
              aggregate liability for any claim arising out of or related to
              the service is limited to the greater of (a) the marketplace
              facilitation fees you paid to vibechckd in the twelve months
              preceding the claim, or (b) one hundred US dollars (USD 100).
            </p>
            <p>
              In no event will vibechckd be liable for indirect, incidental,
              special, consequential, or punitive damages, including lost
              profits, lost revenue, or loss of data, even if advised of the
              possibility of such damages.
            </p>
          </Section>

          <Section title="11. Indemnification">
            <p>
              You agree to indemnify and hold vibechckd harmless from any
              claim, loss, or expense (including reasonable attorneys&apos;
              fees) arising out of your use of the service, your content, your
              breach of these terms, or your interactions with any other user.
            </p>
          </Section>

          <Section title="12. Termination">
            <p>
              You may close your account at any time from your dashboard
              settings. We may suspend or terminate accounts that violate
              these terms, attempt fraud, or pose risk to other users or to
              the integrity of Whop&apos;s payment rails. Upon termination,
              your right to use the service ends; sections of these terms
              that by their nature should survive termination (including
              limitation of liability, indemnification, and dispute
              resolution) will survive.
            </p>
          </Section>

          <Section title="13. Governing law and disputes">
            <p>
              These terms are governed by the laws of the State of Delaware,
              without regard to its conflict-of-laws principles. Any dispute
              not resolved informally will be resolved by binding arbitration
              administered by the American Arbitration Association under its
              Commercial Arbitration Rules, in English, on an individual
              basis. You and vibechckd each waive any right to a jury trial
              or to participate in a class action.
            </p>
            <p>
              Either party may seek injunctive relief in a court of competent
              jurisdiction for intellectual-property infringement or
              unauthorized access to the service. Disputes related to
              payments are governed by Whop&apos;s terms.
            </p>
          </Section>

          <Section title="14. Changes to these terms">
            <p>
              We may update these terms from time to time. Material changes
              will be announced in-app or via email at least seven days before
              taking effect. Continued use of the service after the effective
              date constitutes acceptance of the updated terms.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these terms? Email{" "}
              <a
                href="mailto:hello@vibechckd.cc"
                className="underline hover:text-text-primary"
              >
                hello@vibechckd.cc
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/"
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to vibechckd
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] md:text-[18px] font-semibold text-text-primary tracking-[-0.01em]">
        {title}
      </h2>
      {children}
    </section>
  );
}
