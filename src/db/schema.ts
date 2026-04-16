import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Enums ──

export const userRoleEnum = pgEnum("user_role", ["coder", "client", "admin"]);
export const availabilityEnum = pgEnum("availability", ["available", "selective", "unavailable"]);
export const profileStatusEnum = pgEnum("profile_status", ["draft", "pending", "active", "suspended"]);
export const assetTypeEnum = pgEnum("asset_type", ["pdf", "image", "video", "live_preview", "figma"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "proposal", "active", "review", "completed", "cancelled"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const deliverableStatusEnum = pgEnum("deliverable_status", ["pending", "submitted", "approved", "revision_requested"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "file", "system", "ai"]);
export const applicationStatusEnum = pgEnum("application_status", ["applied", "under_review", "interview", "approved", "rejected"]);

// ── Auth Tables (NextAuth v5 / Drizzle Adapter) ──

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("coder").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

// ── Coder Profiles ──

export const coderProfiles = pgTable("coder_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  creatorSlug: text("creator_slug").unique(),
  bio: text("bio"),
  tagline: text("tagline"),
  location: text("location"),
  specialties: text("specialties").array(),
  tags: text("tags").array(),
  hourlyRate: text("hourly_rate"),
  availability: availabilityEnum("availability").default("available"),
  status: profileStatusEnum("status").default("draft"),
  verifiedAt: timestamp("verified_at", { mode: "date" }),
  pfpUrl: text("pfp_url"),
  gifPreviewUrl: text("gif_preview_url"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Client Profiles ──

export const companyStageEnum = pgEnum("company_stage", ["idea", "startup", "growing", "established", "enterprise"]);

export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  companyName: text("company_name"),
  companyStage: companyStageEnum("company_stage"),
  industry: text("industry"),
  website: text("website"),
  description: text("description"),
  projectTypes: text("project_types").array(),
  budgetRange: text("budget_range"),
  teamSize: text("team_size"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Portfolio ──

export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  coderProfileId: uuid("coder_profile_id").notNull().references(() => coderProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const portfolioAssets = pgTable("portfolio_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  portfolioItemId: uuid("portfolio_item_id").notNull().references(() => portfolioItems.id, { onDelete: "cascade" }),
  assetType: assetTypeEnum("asset_type").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Projects ──

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("draft"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleLabel: text("role_label").notNull(),
  addedAt: timestamp("added_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Tasks ──

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assignedTo: uuid("assigned_to").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo"),
  dueDate: timestamp("due_date", { mode: "date" }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Deliverables ──

export const deliverables = pgTable("deliverables", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  liveUrl: text("live_url"),
  status: deliverableStatusEnum("status").default("pending"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Messages ──

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").default("text"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Invoices ──

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "voided", "past_due", "uncollectible"]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  whopInvoiceId: text("whop_invoice_id").unique(),
  senderId: uuid("sender_id").references(() => users.id),
  recipientId: uuid("recipient_id").references(() => users.id),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  dueDate: timestamp("due_date", { mode: "date" }),
  paidAt: timestamp("paid_at", { mode: "date" }),
  paymentUrl: text("payment_url"),
  messageId: uuid("message_id").references(() => messages.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const invoiceSplits = pgTable("invoice_splits", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  paid: boolean("paid").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Transactions ──

export const transactionTypeEnum = pgEnum("transaction_type", ["invoice_payment", "direct_payment", "withdrawal", "refund", "platform_fee"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "cancelled"]);

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  whopTransferId: text("whop_transfer_id"),
  whopCheckoutId: text("whop_checkout_id"),
  paymentUrl: text("payment_url"),
  senderId: uuid("sender_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  whopWithdrawalId: text("whop_withdrawal_id"),
  payoutMethod: text("payout_method"),
  requestedAt: timestamp("requested_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  failureReason: text("failure_reason"),
});

// ── Applications ──

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  specialties: text("specialties").array(),
  portfolioLinks: text("portfolio_links").array(),
  sampleProjectUrl: text("sample_project_url"),
  rateExpectation: text("rate_expectation"),
  pitch: text("pitch"),
  status: applicationStatusEnum("status").default("applied"),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
});
