-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderProcessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");
