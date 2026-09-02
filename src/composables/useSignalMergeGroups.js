// Lets specific signals share a chart within MtVergleich's "Gestapelt"
// view instead of every signal always getting its own row — e.g. plot #3
// together with #1, or #5 with #2, while everything else stays
// one-per-chart. Extracted out of MtVergleich.vue because the whole thing
// is a self-contained algorithm over `compareSeries` (a computed/ref the
// caller passes in) plus a single local map — it never touches Chart.js,
// ChartCard, or any of the page's other state.
import { ref, computed } from "vue";

// compareSeries: a ref/computed whose .value is mtStore.compareSeries
// (an array of series objects each carrying a unique `key`).
export function useSignalMergeGroups(compareSeries) {
  // Keyed by series.key; value is the key of another series to join
  // into, or "" for its own chart. Single-hop only (a series that's
  // itself a merge target doesn't chase further merges of its own) —
  // enough for "combine these two/three signals" without the bookkeeping
  // of arbitrary merge chains.
  const mergeGroupOf = ref({});

  // A series currently acting as a leader for OTHER followers can't itself
  // be folded into a different plot — doing so via the single-hop model
  // would silently orphan its followers into a group whose "leader" no
  // longer renders its own chart. Compute the set of such off-limits keys
  // once so every chart's menu can just check against it.
  const groupLeaderKeys = computed(() => {
    const counts = new Map();
    for (const target of Object.values(mergeGroupOf.value)) {
      if (target) counts.set(target, (counts.get(target) || 0) + 1);
    }
    return new Set([...counts.keys()].filter((k) => counts.get(k) > 0));
  });

  function canJoinGroup(series) {
    return !groupLeaderKeys.value.has(series.key);
  }

  function isGroupLeader(item, series) {
    return item.anchorKey === series.key;
  }

  function isInGroup(item, series) {
    return item.members.some((m) => m.key === series.key);
  }

  function toggleGroupMembership(item, series, checked) {
    mergeGroupOf.value = { ...mergeGroupOf.value, [series.key]: checked ? item.anchorKey : "" };
  }

  // Resolves mergeGroupOf into actual groups of series, preserving each
  // group's first-appearance position in compareSeries so the stacked
  // list doesn't visibly reshuffle just because of a merge.
  const stackedGroups = computed(() => {
    const series = compareSeries.value;
    const byKey = new Map(series.map((s) => [s.key, s]));
    const leaderOf = new Map(); // seriesKey -> leaderKey
    for (const s of series) {
      const target = mergeGroupOf.value[s.key];
      leaderOf.set(s.key, target && byKey.has(target) ? target : s.key);
    }
    const groups = new Map(); // leaderKey -> [series...]
    for (const s of series) {
      const leader = leaderOf.get(s.key);
      if (!groups.has(leader)) groups.set(leader, []);
      groups.get(leader).push(s);
    }
    const seen = new Set();
    const ordered = [];
    for (const s of series) {
      const leader = leaderOf.get(s.key);
      if (seen.has(leader)) continue;
      seen.add(leader);
      // anchorKey is the actual leader/target key from mergeGroupOf — NOT
      // necessarily members[0], since a follower can appear earlier than
      // its anchor in compareSeries (e.g. you merge an already-earlier
      // signal INTO a later one). Carrying this alongside the members
      // array means the arrow-menu UI doesn't have to guess which member
      // is "the" anchor from array order.
      ordered.push({ anchorKey: leader, members: groups.get(leader) });
    }
    return ordered;
  });

  return {
    mergeGroupOf,
    groupLeaderKeys,
    canJoinGroup,
    isGroupLeader,
    isInGroup,
    toggleGroupMembership,
    stackedGroups,
  };
}
