// Folder/owner-filter/search/quota logic for the cloud file browser on
// MtImport.vue — extracted out of the view because it's a fully
// self-contained concern (given the raw `cloudFiles` list + the auth
// store, it only ever talks to messtoolStorage/supabase, never to the
// CSV/Excel parsing side of the page) and was making that file harder to
// scan than it needed to be.
//
// `cloudFiles` must be a ref owned by the caller (populated via
// mtStorage.listMessfiles()); everything folder/quota-related here is
// derived from it or from calls this composable makes itself.
import { ref, computed, watch } from "vue";
import { supabase } from "../lib/supabase";
import * as mtStorage from "../utils/messtoolStorage.js";
import { usernameFromEmail } from "../utils/formatUsername.js";
import { friendlyError } from "../utils/friendlyError.js";
import { showToast } from "./useToast.js";
import { groupByDate } from "../utils/groupByDate.js";

export function useCloudFileFolders(cloudFiles, auth, { onError } = {}) {
  const reportError = onError || (() => {});

  const activeFolder = ref("__all__"); // "__all__" | "__none__" | actual folder name
  const registeredFolders = ref([]); // folders that exist even with zero files in them (see add_folder_registry.sql)
  const showCreateFolderDialog = ref(false);
  const newFolderNameInput = ref("");
  const creatingFolder = ref(false);
  const fileSearchQuery = ref("");

  // Admin sees everyone's files (see messfiles_per_user_visibility_and_quota.sql),
  // so map uploaded_by -> username for an owner chip per file + a "Nutzer" filter,
  // instead of a flat list where it's unclear whose file/folder is whose.
  const adminUserMap = ref({}); // { [userId]: username }
  const selectedOwnerFilter = ref("__all__"); // "__all__" or a specific uploaded_by id

  async function loadAdminUserMap() {
    if (!auth.isAdmin) return;
    const { data, error } = await supabase.rpc("admin_list_users");
    if (!error && data) {
      adminUserMap.value = Object.fromEntries(data.map((u) => [u.id, usernameFromEmail(u.email)]));
    }
  }
  function ownerUsername(file) {
    return adminUserMap.value[file.uploaded_by] || null;
  }
  const ownerOptions = computed(() => {
    const ids = [...new Set(cloudFiles.value.map((f) => f.uploaded_by).filter(Boolean))];
    return ids
      .map((id) => ({ id, label: adminUserMap.value[id] || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // Registered (possibly-empty) folders merged with anything already on a
  // file — covers data from before add_folder_registry.sql existed, or if
  // that migration hasn't been run yet, without treating either source as
  // the sole truth.
  const folders = computed(() => {
    const fromFiles = cloudFiles.value.map((f) => f.folder).filter(Boolean);
    return [...new Set([...registeredFolders.value, ...fromFiles])].sort((a, b) => a.localeCompare(b));
  });
  const unfiledCount = computed(() => searchedCloudFiles.value.filter((f) => !f.folder).length);

  async function loadRegisteredFolders() {
    try {
      registeredFolders.value = await mtStorage.listFolders();
    } catch {
      // Migration (add_folder_registry.sql) not run yet, or offline —
      // folders just fall back to whatever's inferred from the files
      // themselves instead of blocking the whole file list on this.
    }
  }

  async function createFolderNow() {
    const name = newFolderNameInput.value.trim();
    if (!name) return;
    creatingFolder.value = true;
    try {
      await mtStorage.createFolder(name);
      if (!registeredFolders.value.includes(name)) registeredFolders.value.push(name);
      activeFolder.value = name;
      showCreateFolderDialog.value = false;
      newFolderNameInput.value = "";
      showToast(`Ordner "${name}" erstellt.`);
    } catch (e) {
      reportError("Ordner konnte nicht erstellt werden: " + friendlyError(e));
    }
    creatingFolder.value = false;
  }

  const ownerFilteredCloudFiles = computed(() => {
    if (!auth.isAdmin || selectedOwnerFilter.value === "__all__") return cloudFiles.value;
    return cloudFiles.value.filter((f) => f.uploaded_by === selectedOwnerFilter.value);
  });
  const searchedCloudFiles = computed(() => {
    const q = (fileSearchQuery.value || "").trim().toLowerCase();
    if (!q) return ownerFilteredCloudFiles.value;
    return ownerFilteredCloudFiles.value.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      // signal_names is populated at upload time (see messtoolStorage.js)
      // — older files uploaded before that existed just have it null/[]
      // and only match on filename, same as before.
      (f.signal_names || []).some((n) => n.toLowerCase().includes(q)),
    );
  });
  const folderFilteredFiles = computed(() => {
    if (activeFolder.value === "__all__") return searchedCloudFiles.value;
    if (activeFolder.value === "__none__") return searchedCloudFiles.value.filter((f) => !f.folder);
    return searchedCloudFiles.value.filter((f) => f.folder === activeFolder.value);
  });

  // Folder-first structure for the "Alle" view — one section per folder
  // (+ "Ohne Ordner" last, only if it has anything), each carrying its own
  // file count/size so you don't have to expand it just to see how big it
  // is.
  const folderSections = computed(() => {
    const sections = folders.value.map((folder) => {
      const files = searchedCloudFiles.value.filter((f) => f.folder === folder);
      return { key: folder, label: folder, files, bytes: files.reduce((sum, f) => sum + (f.size_bytes || 0), 0) };
    });
    const unfiled = searchedCloudFiles.value.filter((f) => !f.folder);
    if (unfiled.length) {
      sections.push({ key: "__none__", label: "Ohne Ordner", files: unfiled, bytes: unfiled.reduce((sum, f) => sum + (f.size_bytes || 0), 0) });
    }
    return sections;
  });
  // All sections start expanded — collapsing is for tidying away a folder
  // you're not currently interested in, not a default "everything hidden"
  // state that would just hide files people expect to see immediately.
  const openFolderSections = ref([]);
  const seenFolderKeys = new Set(); // tracks which folders we've ever shown, so a later reload doesn't force-reopen ones the user deliberately collapsed
  watch(folderSections, (sections) => {
    const currentKeys = new Set(sections.map((s) => s.key));
    const newlyAppeared = sections.filter((s) => !seenFolderKeys.has(s.key)).map((s) => s.key);
    for (const k of currentKeys) seenFolderKeys.add(k);
    const stillOpen = openFolderSections.value.filter((k) => currentKeys.has(k));
    openFolderSections.value = [...new Set([...stillOpen, ...newlyAppeared])];
  }, { immediate: true });

  const totalStorageBytes = computed(() => cloudFiles.value.reduce((sum, f) => sum + (f.size_bytes || 0), 0));
  // For a regular user cloudFiles already only contains their own rows (RLS), but an
  // admin sees everyone's files here — quota must always be based on just their own.
  const myStorageBytes = computed(() =>
    cloudFiles.value
      .filter((f) => f.uploaded_by === auth.user?.id)
      .reduce((sum, f) => sum + (f.size_bytes || 0), 0),
  );
  // Kept in sync with supabase/messfiles_per_user_visibility_and_quota.sql
  const QUOTA_BYTES = computed(() => (auth.isAdmin ? 100 : 30) * 1024 * 1024);
  const quotaUsedPct = computed(() => Math.min(100, (myStorageBytes.value / QUOTA_BYTES.value) * 100));
  const quotaExceeded = computed(() => myStorageBytes.value >= QUOTA_BYTES.value);
  const folderStorageBytes = computed(() => folderFilteredFiles.value.reduce((sum, f) => sum + (f.size_bytes || 0), 0));
  const activeFolderLabel = computed(() => (activeFolder.value === "__none__" ? "Ohne Ordner" : activeFolder.value));

  // If the folder you're currently looking at disappears (its last file got
  // moved/deleted elsewhere), don't keep silently filtering to nothing —
  // fall back to "Alle" instead of showing an empty list with no obvious
  // way out.
  watch(folders, (list) => {
    if (activeFolder.value !== "__all__" && activeFolder.value !== "__none__" && !list.includes(activeFolder.value)) {
      activeFolder.value = "__all__";
    }
  });

  async function moveFileToFolder(f, folder) {
    const previous = f.folder;
    f.folder = folder || null; // optimistic — feels instant, matches the rest of the list's snappiness
    try {
      await mtStorage.setMessfileFolder(f.id, folder);
      if (folder && !registeredFolders.value.includes(folder)) {
        registeredFolders.value.push(folder);
        mtStorage.createFolder(folder).catch(() => {}); // best effort — worst case it just falls back to file-derived next reload
      }
    } catch (e) {
      f.folder = previous; // roll back on failure
      reportError("Ordner konnte nicht gespeichert werden: " + friendlyError(e));
    }
  }

  // Renaming/dissolving touches both the registry entry and every file
  // still carrying the old name — otherwise a renamed folder would keep
  // existing under its old name too (now empty, but still registered).
  async function renameOrDeleteFolder(folder) {
    const newName = prompt(`Ordner "${folder}" umbenennen (leer lassen zum Auflösen):`, folder);
    if (newName === null) return; // cancelled
    const target = newName.trim() || null;
    // Only touch files actually named into this folder — and, if an admin is
    // browsing "Alle Nutzer" while two different users happen to have a
    // folder with the same name, each user's folder is renamed/deleted
    // independently instead of one blanket action wiping both.
    const affected = cloudFiles.value.filter((f) => f.folder === folder);
    const owners = [...new Set(affected.map((f) => f.uploaded_by).filter(Boolean))];
    for (const f of affected) {
      await moveFileToFolder(f, target);
    }
    try {
      if (owners.length <= 1) {
        if (target) await mtStorage.createFolder(target);
        await mtStorage.deleteFolder(folder, owners[0]);
      } else {
        // Multiple owners shared this folder name — resolve each one on its own.
        for (const ownerId of owners) {
          if (target) await mtStorage.createFolder(target); // best effort; unique per (name, owner)
          await mtStorage.deleteFolder(folder, ownerId);
        }
      }
    } catch (e) {
      reportError("Ordner-Registrierung konnte nicht aktualisiert werden: " + friendlyError(e));
    }
    registeredFolders.value = registeredFolders.value.filter((f) => f !== folder);
    if (target && !registeredFolders.value.includes(target)) registeredFolders.value.push(target);
    if (activeFolder.value === folder) activeFolder.value = target || "__none__";
  }

  return {
    activeFolder,
    registeredFolders,
    showCreateFolderDialog,
    newFolderNameInput,
    creatingFolder,
    fileSearchQuery,
    adminUserMap,
    selectedOwnerFilter,
    loadAdminUserMap,
    ownerUsername,
    ownerOptions,
    folders,
    unfiledCount,
    loadRegisteredFolders,
    createFolderNow,
    ownerFilteredCloudFiles,
    searchedCloudFiles,
    folderFilteredFiles,
    folderSections,
    openFolderSections,
    groupedCloudFiles: computed(() => groupByDate(folderFilteredFiles.value)),
    totalStorageBytes,
    myStorageBytes,
    QUOTA_BYTES,
    quotaUsedPct,
    quotaExceeded,
    folderStorageBytes,
    activeFolderLabel,
    moveFileToFolder,
    renameOrDeleteFolder,
  };
}
