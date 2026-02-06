-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'FR',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "country" TEXT,

    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showLastSeen" BOOLEAN NOT NULL DEFAULT true,
    "showCountryOnProfile" BOOLEAN NOT NULL DEFAULT true,
    "communityVisible" BOOLEAN NOT NULL DEFAULT true,

    "autoAwayMinutes" INTEGER NOT NULL DEFAULT 30,

    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyRequests" BOOLEAN NOT NULL DEFAULT true,
    "notifyDocuments" BOOLEAN NOT NULL DEFAULT true,
    "notifyPayments" BOOLEAN NOT NULL DEFAULT true,
    "notifyMeetings" BOOLEAN NOT NULL DEFAULT true,
    "notifyEvents" BOOLEAN NOT NULL DEFAULT true,
    "notifyMarketplace" BOOLEAN NOT NULL DEFAULT true,
    "notificationFrequency" TEXT NOT NULL DEFAULT 'IMMEDIATE',

    "allowFollow" BOOLEAN NOT NULL DEFAULT true,
    "showFollowersCount" BOOLEAN NOT NULL DEFAULT true,
    "showBadges" BOOLEAN NOT NULL DEFAULT true,
    "allowReviews" BOOLEAN NOT NULL DEFAULT true,
    "showRatingPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showReviewComments" BOOLEAN NOT NULL DEFAULT true,

    "deletionRequestedAt" TIMESTAMP(3),
    "deletionScheduledAt" TIMESTAMP(3),

    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
