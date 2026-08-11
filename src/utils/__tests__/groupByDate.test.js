import { describe, it, expect } from "vitest";
import { groupByDate } from "../groupByDate.js";

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

describe("groupByDate", () => {
  it("puts a just-created item in Heute", () => {
    const groups = groupByDate([{ id: 1, created_at: hoursAgo(0.1) }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Heute");
  });

  it("splits Heute and Gestern correctly across midnight, not just by 24h elapsed", () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const justAfterMidnight = new Date(startOfToday.getTime() + 5 * 60 * 1000); // 00:05 today
    const justBeforeMidnight = new Date(startOfToday.getTime() - 5 * 60 * 1000); // 23:55 yesterday

    const groups = groupByDate([
      { id: "today", created_at: justAfterMidnight.toISOString() },
      { id: "yesterday", created_at: justBeforeMidnight.toISOString() },
    ]);

    const todayGroup = groups.find((g) => g.label === "Heute");
    const yesterdayGroup = groups.find((g) => g.label === "Gestern");
    expect(todayGroup.items.map((i) => i.id)).toEqual(["today"]);
    expect(yesterdayGroup.items.map((i) => i.id)).toEqual(["yesterday"]);
  });

  it("omits empty buckets entirely rather than showing empty headers", () => {
    const groups = groupByDate([{ id: 1, created_at: hoursAgo(0.1) }]);
    expect(groups.map((g) => g.label)).toEqual(["Heute"]);
  });

  it("orders buckets most-recent-first regardless of item order within them", () => {
    const groups = groupByDate([
      { id: "old", created_at: new Date(2020, 0, 1).toISOString() },
      { id: "today", created_at: hoursAgo(0.1) },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Heute", "Älter"]);
  });

  it("supports a custom date field name", () => {
    const groups = groupByDate([{ id: 1, uploadedAt: hoursAgo(0.1) }], "uploadedAt");
    expect(groups[0].label).toBe("Heute");
  });
});
