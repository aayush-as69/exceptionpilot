CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"exception_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"report" jsonb NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"estimated_cost" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"exception_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"required_role" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"tool" text,
	"target" text NOT NULL,
	"input_summary" text NOT NULL,
	"result" text NOT NULL,
	"risk" integer,
	"approval" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"request_id" text NOT NULL,
	"idempotency_key" text,
	CONSTRAINT "audit_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" text PRIMARY KEY NOT NULL,
	"exception_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"evidence" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"owner" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" text NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mime" text NOT NULL,
	"filename" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'DETECTED' NOT NULL,
	"owner_id" text,
	"sla_hours" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"recommendation" text,
	"root_cause" text NOT NULL,
	"resolution" text,
	"idempotency_key" text NOT NULL,
	CONSTRAINT "exceptions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exception_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" text NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"po_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"items" jsonb NOT NULL,
	"received_quantity" integer NOT NULL,
	"accepted_quantity" integer NOT NULL,
	"rejected_quantity" integer NOT NULL,
	"warehouse" text NOT NULL,
	CONSTRAINT "goods_receipts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"vendor_id" text NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"po_id" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"payment_status" text DEFAULT 'UNPAID' NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"exception_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"steps" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"tolerance_percent" double precision DEFAULT 5 NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"owner" text NOT NULL,
	"document_id" text
);
--> statement-breakpoint
CREATE TABLE "policy_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"policy_id" text,
	"section" text NOT NULL,
	"page" integer NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"vendor_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"items" jsonb NOT NULL,
	"approval_status" text NOT NULL,
	"delivery_status" text NOT NULL,
	CONSTRAINT "purchase_orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"assignee" text NOT NULL,
	"priority" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'TODO' NOT NULL,
	"exception_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"initials" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"email" text NOT NULL,
	"city" text NOT NULL,
	"tax_id" text NOT NULL,
	"bank_last4" text NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"contract_status" text DEFAULT 'ACTIVE' NOT NULL,
	"contract_expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_required_role_roles_id_fk" FOREIGN KEY ("required_role") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_chunks" ADD CONSTRAINT "policy_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_chunks" ADD CONSTRAINT "policy_chunks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_users_id_fk" FOREIGN KEY ("assignee") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_exception_idx" ON "agent_runs" USING btree ("exception_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_pending_approval_idx" ON "approvals" USING btree ("exception_id") WHERE "approvals"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "approval_status_idx" ON "approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "audit_events" USING btree ("target");--> statement-breakpoint
CREATE INDEX "audit_time_idx" ON "audit_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "exception_status_idx" ON "exceptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exception_risk_idx" ON "exceptions" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "exception_vendor_idx" ON "exceptions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "exception_due_idx" ON "exceptions" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "exception_owner_idx" ON "exceptions" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_feedback_per_user_idx" ON "feedback" USING btree ("exception_id","user_id");--> statement-breakpoint
CREATE INDEX "grn_po_idx" ON "goods_receipts" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "invoice_vendor_idx" ON "invoices" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "invoice_number_idx" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE INDEX "invoice_created_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "chunk_document_idx" ON "policy_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunk_policy_idx" ON "policy_chunks" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "po_vendor_idx" ON "purchase_orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "session_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "task_assignee_idx" ON "tasks" USING btree ("assignee");