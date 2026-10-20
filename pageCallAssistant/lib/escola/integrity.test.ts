import { describe, it, expect } from "vitest";
import {
  computeGradeHash,
  buildRootHash,
  pseudonymize,
  generateVerificationCode,
} from "./integrity";

const BASE_ENTRY = {
  networkId: "net1",
  assessmentId: "assess1",
  studentId: "student1",
  value: 8.5,
  absent: false,
  version: 1,
  correctionId: null,
  enteredById: "teacher1",
  enteredAt: "2027-03-10T10:00:00.000Z",
  prevHash: "0".repeat(64),
};

describe("computeGradeHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = computeGradeHash(BASE_ENTRY);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic for the same input", () => {
    expect(computeGradeHash(BASE_ENTRY)).toBe(computeGradeHash(BASE_ENTRY));
  });

  it("changes when value changes", () => {
    const h1 = computeGradeHash(BASE_ENTRY);
    const h2 = computeGradeHash({ ...BASE_ENTRY, value: 7.0 });
    expect(h1).not.toBe(h2);
  });

  it("changes when studentId changes", () => {
    const h1 = computeGradeHash(BASE_ENTRY);
    const h2 = computeGradeHash({ ...BASE_ENTRY, studentId: "student2" });
    expect(h1).not.toBe(h2);
  });

  it("changes when prevHash changes (chain integrity)", () => {
    const h1 = computeGradeHash(BASE_ENTRY);
    const h2 = computeGradeHash({ ...BASE_ENTRY, prevHash: "a".repeat(64) });
    expect(h1).not.toBe(h2);
  });

  it("treats null value differently from 0", () => {
    const h1 = computeGradeHash({ ...BASE_ENTRY, value: null });
    const h2 = computeGradeHash({ ...BASE_ENTRY, value: 0 });
    expect(h1).not.toBe(h2);
  });
});

describe("buildRootHash", () => {
  it("returns a 64-char hex for non-empty array", () => {
    const root = buildRootHash(["abc123", "def456"]);
    expect(root).toHaveLength(64);
  });

  it("is order-independent (sorted internally)", () => {
    const r1 = buildRootHash(["abc", "def"]);
    const r2 = buildRootHash(["def", "abc"]);
    expect(r1).toBe(r2);
  });

  it("returns a hash for empty array", () => {
    const root = buildRootHash([]);
    expect(root).toHaveLength(64);
  });

  it("differs for different hash sets", () => {
    const r1 = buildRootHash(["aaa"]);
    const r2 = buildRootHash(["bbb"]);
    expect(r1).not.toBe(r2);
  });
});

describe("pseudonymize", () => {
  it("returns a 16-char hex string", () => {
    const id = pseudonymize("student-abc");
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    expect(pseudonymize("student-abc")).toBe(pseudonymize("student-abc"));
  });

  it("is different for different students", () => {
    expect(pseudonymize("student-abc")).not.toBe(pseudonymize("student-xyz"));
  });

  it("does not contain the original studentId", () => {
    const id = pseudonymize("student-visible-name");
    expect(id).not.toContain("student-visible-name");
  });
});

describe("generateVerificationCode", () => {
  it("returns a 12-char uppercase hex string", () => {
    const code = generateVerificationCode("net1", "cs1", "term1", 1);
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[0-9A-F]+$/);
  });

  it("differs for different inputs", () => {
    const c1 = generateVerificationCode("net1", "cs1", "term1", 1);
    const c2 = generateVerificationCode("net2", "cs2", "term2", 2);
    expect(c1).not.toBe(c2);
  });
});
