import { computeSlots, type SlotInput, type Slot } from "../lib/slots";

const baseInput: SlotInput = {
  date: "2026-11-10",
  timeZone: "Europe/Istanbul",
  intervals: [{ startMinute: 540, endMinute: 720 }],
  durationMinutes: 60,
  busy: [],
  now: new Date("2026-01-01T00:00:00Z"),
  stepMinutes: 30,
};

const starts = (slots: Slot[]) => slots.map((slot) => slot.start.toISOString());

describe("computeSlots", () => {
  it("generates slots on the step grid inside a working interval", () => {
    const slots = computeSlots(baseInput);

    expect(starts(slots)).toEqual([
      "2026-11-10T06:00:00.000Z",
      "2026-11-10T06:30:00.000Z",
      "2026-11-10T07:00:00.000Z",
      "2026-11-10T07:30:00.000Z",
      "2026-11-10T08:00:00.000Z",
    ]);
  });

  it("removes slots overlapping a busy period but keeps back-to-back ones", () => {
    const slots = computeSlots({
      ...baseInput,
      busy: [
        {
          start: new Date("2026-11-10T07:00:00Z"),
          end: new Date("2026-11-10T08:00:00Z"),
        },
      ],
    });

    expect(starts(slots)).toEqual([
      "2026-11-10T06:00:00.000Z",
      "2026-11-10T08:00:00.000Z",
    ]);
  });

  it("removes slots that start in the past", () => {
    const slots = computeSlots({
      ...baseInput,
      now: new Date("2026-11-10T07:10:00Z"),
    });

    expect(starts(slots)).toEqual([
      "2026-11-10T07:30:00.000Z",
      "2026-11-10T08:00:00.000Z",
    ]);
  });

  it("does not produce a slot that does not fit the interval", () => {
    const slots = computeSlots({ ...baseInput, durationMinutes: 90 });

    expect(starts(slots)).toEqual([
      "2026-11-10T06:00:00.000Z",
      "2026-11-10T06:30:00.000Z",
      "2026-11-10T07:00:00.000Z",
      "2026-11-10T07:30:00.000Z",
    ]);
  });

  it("handles two intervals in one day (lunch break)", () => {
    const slots = computeSlots({
      ...baseInput,
      stepMinutes: 60,
      intervals: [
        { startMinute: 540, endMinute: 600 },
        { startMinute: 780, endMinute: 840 },
      ],
    });

    expect(starts(slots)).toEqual([
      "2026-11-10T06:00:00.000Z",
      "2026-11-10T10:00:00.000Z",
    ]);
  });

  it("aligns slots to the grid when the interval starts off-grid", () => {
    const slots = computeSlots({
      ...baseInput,
      durationMinutes: 30,
      intervals: [{ startMinute: 550, endMinute: 630 }],
    });

    expect(starts(slots)).toEqual([
      "2026-11-10T06:30:00.000Z",
      "2026-11-10T07:00:00.000Z",
    ]);
  });

  it("returns no slots when there are no working intervals", () => {
    expect(computeSlots({ ...baseInput, intervals: [] })).toEqual([]);
  });

  it("converts the same wall-clock time to different UTC instants across DST", () => {
    const berlin: SlotInput = {
      ...baseInput,
      timeZone: "Europe/Berlin",
      stepMinutes: 60,
      intervals: [{ startMinute: 540, endMinute: 600 }],
    };

    const before = computeSlots({ ...berlin, date: "2026-03-28" });
    const after = computeSlots({ ...berlin, date: "2026-03-30" });

    expect(starts(before)).toEqual(["2026-03-28T08:00:00.000Z"]);
    expect(starts(after)).toEqual(["2026-03-30T07:00:00.000Z"]);
  });
});