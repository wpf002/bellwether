import { describe, expect, it } from "vitest";
import { selectNewRecords } from "./dedupe.js";

const rec = (contentHash: string, id = contentHash) => ({ id, contentHash });

describe("selectNewRecords", () => {
  it("drops records whose hash is already persisted", () => {
    const fresh = selectNewRecords([rec("a"), rec("b"), rec("c")], ["a", "c"]);
    expect(fresh.map((r) => r.contentHash)).toEqual(["b"]);
  });

  it("dedupes duplicates within the same batch", () => {
    const fresh = selectNewRecords([rec("a", "1"), rec("a", "2"), rec("b", "3")], []);
    expect(fresh.map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("returns everything when nothing is seen yet", () => {
    expect(selectNewRecords([rec("a"), rec("b")], [])).toHaveLength(2);
  });

  it("returns nothing when all hashes are known", () => {
    expect(selectNewRecords([rec("a"), rec("b")], ["a", "b"])).toEqual([]);
  });
});
