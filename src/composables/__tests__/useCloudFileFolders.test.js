import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useCloudFileFolders } from "../useCloudFileFolders.js";

vi.mock("../../lib/supabase", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })) },
}));
vi.mock("../../utils/messtoolStorage.js", () => ({
  listFolders: vi.fn(async () => []),
  createFolder: vi.fn(async () => {}),
  setMessfileFolder: vi.fn(async () => {}),
  deleteFolder: vi.fn(async () => {}),
}));
vi.mock("../useToast.js", () => ({ showToast: vi.fn() }));

function makeFiles() {
  return [
    { id: "1", name: "a.csv", folder: "Bremse", size_bytes: 1000, uploaded_by: "u1" },
    { id: "2", name: "b.csv", folder: "Bremse", size_bytes: 2000, uploaded_by: "u2" },
    { id: "3", name: "c.csv", folder: null, size_bytes: 500, uploaded_by: "u1" },
  ];
}

describe("useCloudFileFolders", () => {
  it("derives folders from the file list", () => {
    const cloudFiles = ref(makeFiles());
    const { folders, unfiledCount } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    expect(folders.value).toEqual(["Bremse"]);
    expect(unfiledCount.value).toBe(1);
  });

  it("filters by active folder", () => {
    const cloudFiles = ref(makeFiles());
    const { activeFolder, folderFilteredFiles } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    activeFolder.value = "Bremse";
    expect(folderFilteredFiles.value.map((f) => f.id)).toEqual(["1", "2"]);
    activeFolder.value = "__none__";
    expect(folderFilteredFiles.value.map((f) => f.id)).toEqual(["3"]);
  });

  it("filters by search query, case-insensitively", () => {
    const cloudFiles = ref(makeFiles());
    const { fileSearchQuery, searchedCloudFiles } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    fileSearchQuery.value = "A.CSV";
    expect(searchedCloudFiles.value.map((f) => f.id)).toEqual(["1"]);
  });

  it("also matches on indexed signal names, not just the filename", () => {
    const files = makeFiles();
    files[1].signal_names = ["Bremsdruck", "Raddrehzahl"];
    const cloudFiles = ref(files);
    const { fileSearchQuery, searchedCloudFiles } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    fileSearchQuery.value = "raddreh";
    expect(searchedCloudFiles.value.map((f) => f.id)).toEqual(["2"]);
  });

  it("treats files without signal_names (older uploads) as filename-only, not a crash", () => {
    const cloudFiles = ref(makeFiles()); // none of these have signal_names set
    const { fileSearchQuery, searchedCloudFiles } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    fileSearchQuery.value = "anything";
    expect(searchedCloudFiles.value).toEqual([]);
  });

  it("doesn't crash when the search field is cleared to null (Vuetify's clearable sets null, not '')", () => {
    const cloudFiles = ref(makeFiles());
    const { fileSearchQuery, searchedCloudFiles } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    fileSearchQuery.value = null;
    expect(() => searchedCloudFiles.value).not.toThrow();
    expect(searchedCloudFiles.value).toHaveLength(3);
  });

  it("computes a non-admin's quota from only their own files", () => {
    const cloudFiles = ref(makeFiles());
    const { myStorageBytes, QUOTA_BYTES, quotaUsedPct, quotaExceeded } = useCloudFileFolders(
      cloudFiles,
      { isAdmin: false, user: { id: "u1" } },
    );
    expect(myStorageBytes.value).toBe(1500); // files 1 + 3, not 2 (owned by u2)
    expect(QUOTA_BYTES.value).toBe(30 * 1024 * 1024);
    expect(quotaUsedPct.value).toBeCloseTo((1500 / (30 * 1024 * 1024)) * 100);
    expect(quotaExceeded.value).toBe(false);
  });

  it("gives admins a bigger quota", () => {
    const cloudFiles = ref(makeFiles());
    const { QUOTA_BYTES } = useCloudFileFolders(cloudFiles, { isAdmin: true, user: { id: "u1" } });
    expect(QUOTA_BYTES.value).toBe(100 * 1024 * 1024);
  });

  it("resets activeFolder to __all__ when the active folder disappears", async () => {
    const cloudFiles = ref(makeFiles());
    const { activeFolder } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    activeFolder.value = "Bremse";
    cloudFiles.value = cloudFiles.value.filter((f) => f.folder !== "Bremse");
    await new Promise((r) => setTimeout(r, 0)); // flush the watcher
    expect(activeFolder.value).toBe("__all__");
  });

  it("builds folder-first sections with per-folder byte totals", () => {
    const cloudFiles = ref(makeFiles());
    const { folderSections } = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    const bremse = folderSections.value.find((s) => s.key === "Bremse");
    expect(bremse.bytes).toBe(3000);
    expect(bremse.files).toHaveLength(2);
    const unfiled = folderSections.value.find((s) => s.key === "__none__");
    expect(unfiled.bytes).toBe(500);
  });

  it("restricts admins' owner-filtered view but leaves non-admins unfiltered", () => {
    const cloudFiles = ref(makeFiles());
    const admin = useCloudFileFolders(ref(makeFiles()), { isAdmin: true, user: { id: "u1" } });
    admin.selectedOwnerFilter.value = "u2";
    expect(admin.searchedCloudFiles.value.map((f) => f.id)).toEqual(["2"]);

    const nonAdmin = useCloudFileFolders(cloudFiles, { isAdmin: false, user: { id: "u1" } });
    nonAdmin.selectedOwnerFilter.value = "u2"; // has no effect for non-admins
    expect(nonAdmin.searchedCloudFiles.value).toHaveLength(3);
  });
});
