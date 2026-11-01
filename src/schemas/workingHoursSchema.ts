import { z } from "zod";
import { parseTime } from "../lib/time";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

export const replaceWorkingHoursSchema = z
  .object({
    hours: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(1).max(7),
          start: timeString,
          end: timeString,
        }),
      )
      .max(50),
  })
  .superRefine((value, ctx) => {
    const byDay = new Map<
      number,
      { start: number; end: number; index: number }[]
    >();

    value.hours.forEach((item, index) => {
      const start = parseTime(item.start);
      const end = parseTime(item.end);

      if (start >= end) {
        ctx.addIssue({
          code: "custom",
          path: ["hours", index, "start"],
          message: "End must be after start",
        });
        return;
      }

      const list = byDay.get(item.dayOfWeek) ?? [];
      list.push({ start, end, index });
      byDay.set(item.dayOfWeek, list);
    });

    for (const list of byDay.values()) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i].start < list[i - 1].end) {
          ctx.addIssue({
            code: "custom",
            path: ["hours", list[i].index, "start"],
            message: "Overlap with another interval",
          });
        }
      }
    }
  });

  export type ReplaceWorkingHoursInput = z.infer<typeof replaceWorkingHoursSchema>;