CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT appointment_no_overlap
EXCLUDE USING gist (
  "memberId" WITH =,
  tsrange("startsAt", "endsAt", '[)') WITH &&
) WHERE ("status" <> 'CANCELLED');