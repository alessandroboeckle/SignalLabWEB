import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null); // Supabase user object, or null
  const approved = ref(false); // is this user approved in profiles?
  const loading = ref(true); // true while we check the initial session
  const errorMsg = ref("");

  // Check whether the logged-in user is approved (reads their own profile row).
  async function refreshApproval() {
    if (!user.value) {
      approved.value = false;
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.value.id)
      .single();

    if (error) {
      approved.value = false;
      return;
    }
    approved.value = !!data?.approved;
  }

  // Called once on app start, and whenever auth state changes.
  async function init() {
    loading.value = true;
    const { data } = await supabase.auth.getSession();
    user.value = data.session?.user ?? null;
    await refreshApproval();
    loading.value = false;

    // React to login/logout happening in this or another tab.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null;
      await refreshApproval();
    });
  }

  async function signIn(email, password) {
    errorMsg.value = "";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      errorMsg.value = translateError(error.message);
      return false;
    }
    await refreshApproval();
    return true;
  }

  async function signUp(email, password) {
    errorMsg.value = "";
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      errorMsg.value = translateError(error.message);
      return false;
    }
    return true;
  }

  async function signOut() {
    await supabase.auth.signOut();
    user.value = null;
    approved.value = false;
  }

  // Turn common Supabase messages into friendlier German text.
  function translateError(msg) {
    if (!msg) return "Unbekannter Fehler.";
    if (msg.includes("Invalid login credentials"))
      return "E-Mail oder Passwort falsch.";
    if (msg.includes("already registered"))
      return "Diese E-Mail ist bereits registriert.";
    if (msg.includes("Password should be at least"))
      return "Passwort muss mindestens 6 Zeichen haben.";
    if (msg.includes("Unable to validate email"))
      return "Ungültige E-Mail-Adresse.";
    return msg;
  }

  return {
    user,
    approved,
    loading,
    errorMsg,
    init,
    signIn,
    signUp,
    signOut,
    refreshApproval,
  };
});
