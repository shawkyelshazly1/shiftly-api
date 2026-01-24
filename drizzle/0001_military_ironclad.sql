CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by_id" text,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "team_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_permission" (
	"user_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text,
	CONSTRAINT "user_permission_user_id_permission_id_pk" PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_role_id_role_id_fk";
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitation_invitedById_idx" ON "invitation" USING btree ("invited_by_id");--> statement-breakpoint
CREATE INDEX "invitation_userId_idx" ON "invitation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_deletedAt_idx" ON "team" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "teamMember_userId_idx" ON "team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "userPermission_permissionId_idx" ON "user_permission" USING btree ("permission_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_deletedAt_idx" ON "role" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "rolePermission_permissionId_idx" ON "role_permission" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "user_roleId_idx" ON "user" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_deletedAt_idx" ON "user" USING btree ("deleted_at");