-- CreateTable
CREATE TABLE "WorkingInterval" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkingInterval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkingInterval_memberId_dayOfWeek_idx" ON "WorkingInterval"("memberId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "WorkingInterval" ADD CONSTRAINT "WorkingInterval_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
