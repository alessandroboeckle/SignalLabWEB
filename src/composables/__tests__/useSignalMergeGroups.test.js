import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSignalMergeGroups } from "../useSignalMergeGroups.js";

function series(keys) {
  return keys.map((key) => ({ key }));
}

describe("useSignalMergeGroups", () => {
  it("gives every series its own group by default", () => {
    const compareSeries = ref(series(["a", "b", "c"]));
    const { stackedGroups } = useSignalMergeGroups(compareSeries);
    expect(stackedGroups.value).toEqual([
      { anchorKey: "a", members: [{ key: "a" }] },
      { anchorKey: "b", members: [{ key: "b" }] },
      { anchorKey: "c", members: [{ key: "c" }] },
    ]);
  });

  it("merges a series into another's group", () => {
    const compareSeries = ref(series(["a", "b", "c"]));
    const { mergeGroupOf, stackedGroups } = useSignalMergeGroups(compareSeries);
    mergeGroupOf.value = { b: "a" };
    expect(stackedGroups.value).toEqual([
      { anchorKey: "a", members: [{ key: "a" }, { key: "b" }] },
      { anchorKey: "c", members: [{ key: "c" }] },
    ]);
  });

  it("preserves first-appearance order even when a later signal is the anchor", () => {
    const compareSeries = ref(series(["a", "b", "c"]));
    const { mergeGroupOf, stackedGroups } = useSignalMergeGroups(compareSeries);
    // "a" (appears first) merges INTO "c" (appears last) — the group
    // should still show up at "a"'s original position, not get pushed
    // down to where "c" is.
    mergeGroupOf.value = { a: "c" };
    expect(stackedGroups.value.map((g) => g.anchorKey)).toEqual(["c", "b"]);
  });

  it("ignores a merge target that no longer exists in compareSeries", () => {
    const compareSeries = ref(series(["a", "b"]));
    const { mergeGroupOf, stackedGroups } = useSignalMergeGroups(compareSeries);
    mergeGroupOf.value = { a: "gone" };
    expect(stackedGroups.value).toEqual([
      { anchorKey: "a", members: [{ key: "a" }] },
      { anchorKey: "b", members: [{ key: "b" }] },
    ]);
  });

  it("prevents a group leader from joining another group", () => {
    const compareSeries = ref(series(["a", "b", "c"]));
    const { mergeGroupOf, canJoinGroup } = useSignalMergeGroups(compareSeries);
    mergeGroupOf.value = { b: "a" }; // "a" is now a leader
    expect(canJoinGroup({ key: "a" })).toBe(false);
    expect(canJoinGroup({ key: "b" })).toBe(true);
    expect(canJoinGroup({ key: "c" })).toBe(true);
  });

  it("toggleGroupMembership sets/clears a series' merge target", () => {
    const compareSeries = ref(series(["a", "b"]));
    const { mergeGroupOf, toggleGroupMembership } = useSignalMergeGroups(compareSeries);
    const item = { anchorKey: "a" };
    toggleGroupMembership(item, { key: "b" }, true);
    expect(mergeGroupOf.value).toEqual({ b: "a" });
    toggleGroupMembership(item, { key: "b" }, false);
    expect(mergeGroupOf.value).toEqual({ b: "" });
  });

  it("isGroupLeader / isInGroup reflect the resolved group", () => {
    const compareSeries = ref(series(["a", "b"]));
    const { mergeGroupOf, stackedGroups, isGroupLeader, isInGroup } = useSignalMergeGroups(compareSeries);
    mergeGroupOf.value = { b: "a" };
    const group = stackedGroups.value[0];
    expect(isGroupLeader(group, { key: "a" })).toBe(true);
    expect(isGroupLeader(group, { key: "b" })).toBe(false);
    expect(isInGroup(group, { key: "a" })).toBe(true);
    expect(isInGroup(group, { key: "b" })).toBe(true);
  });
});
