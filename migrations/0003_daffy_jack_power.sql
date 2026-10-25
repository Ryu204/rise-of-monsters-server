ALTER TABLE "games" DROP CONSTRAINT "games_name_unique";--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "code" varchar(6) NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "maxPlayers" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "hashedPassword" varchar(256);--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_code_unique" UNIQUE("code");