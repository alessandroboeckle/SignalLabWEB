import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabase";

// One shared Realtime channel per browser tab, used for two independent
// things that both piggyback on the same channel rather than opening two
// separate socket subscriptions:
//   1. Presence — every logged-in tab tracks itself so the Admin page can
//      show who's currently online. Ephemeral (Supabase's Realtime
//      server keeps this in memory only) — no database table needed,
//      nothing to migrate, and stale entries can't linger after a tab
//      closes since presence auto-clears on disconnect.
//   2. Broadcast — lets an admin push a one-off "new version available"
//      style banner to every tab that's open right now. Also ephemeral
//      on purpose: someone who opens the app later doesn't need to see
//      an announcement about something that happened while they were
//      away, they'll just get the current (already-updated) app.
const CHANNEL_NAME = "signallab-presence";

export const usePresenceStore = defineStore("presence", () => {
  const onlineUsers = ref([]); // [{ id, email, online_at }]
  const announcement = ref(null); // { message, sentAt } | null, shown as a dismissible banner

  let channel = null;

  function join(user) {
    if (channel || !user) return;
    try {
      channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: user.id } },
      });

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        onlineUsers.value = Object.values(state)
          .map((entries) => entries[0])
          .filter(Boolean)
          .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      });

      channel.on("broadcast", { event: "announcement" }, ({ payload }) => {
        announcement.value = payload;
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id: user.id, email: user.email, online_at: new Date().toISOString() });
        }
      });
    } catch {
      // Realtime unavailable (offline, blocked, ...) — online list / banner
      // just won't populate, nothing else in the app depends on this.
      channel = null;
    }
  }

  function leave() {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    onlineUsers.value = [];
  }

  async function sendAnnouncement(message) {
    if (!channel || !message?.trim()) return false;
    const { error } = await channel.send({
      type: "broadcast",
      event: "announcement",
      payload: { message: message.trim(), sentAt: new Date().toISOString() },
    });
    return !error;
  }

  function dismissAnnouncement() {
    announcement.value = null;
  }

  return { onlineUsers, announcement, join, leave, sendAnnouncement, dismissAnnouncement };
});
