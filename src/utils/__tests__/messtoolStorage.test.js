import { describe, it, expect, vi, beforeEach } from "vitest";

const insertedRows = [];
const uploadCalls = [];

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    storage: {
      from: () => ({
        upload: async (path, file, opts) => { uploadCalls.push({ path, file, opts }); return { error: null }; },
        remove: async () => ({ error: null }),
      }),
    },
    from: () => ({
      insert: (row) => {
        insertedRows.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: "row1", ...row }, error: null }),
          }),
        };
      },
    }),
  },
}));

import { uploadMessfile } from "../messtoolStorage.js";

function fakeFile(name = "test.csv") {
  return { name, size: 123 };
}

describe("uploadMessfile signal_names", () => {
  beforeEach(() => {
    insertedRows.length = 0;
    uploadCalls.length = 0;
  });

  it("stores the given signal names on the messfiles row", async () => {
    await uploadMessfile(fakeFile(), { signalCount: 2, rowCount: 10, duration: 1 }, ["Bremsdruck", "Raddrehzahl"]);
    expect(insertedRows[0].signal_names).toEqual(["Bremsdruck", "Raddrehzahl"]);
  });

  it("stores null (not an empty array) when no signal names are given", async () => {
    await uploadMessfile(fakeFile(), { signalCount: 0, rowCount: 0, duration: 0 });
    expect(insertedRows[0].signal_names).toBeNull();
  });
});
