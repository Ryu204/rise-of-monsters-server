CREATE TABLE "refreshTokens" (
	"tokenHash" varchar(256) PRIMARY KEY NOT NULL,
	"familyId" uuid NOT NULL,
	"userId" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"familyExpiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"consumedAt" timestamp,
	CONSTRAINT "refreshTokens_familyId_unique" UNIQUE("familyId")
);
