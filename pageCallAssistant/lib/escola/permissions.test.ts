import { describe, it, expect } from "vitest";
import { can, canAny, canAll } from "./permissions";

describe("permissions", () => {
  describe("NETWORK_ADMIN", () => {
    it("can do everything", () => {
      expect(can("NETWORK_ADMIN", "grade:enter")).toBe(true);
      expect(can("NETWORK_ADMIN", "term:close")).toBe(true);
      expect(can("NETWORK_ADMIN", "membership:manage")).toBe(true);
      expect(can("NETWORK_ADMIN", "audit:read")).toBe(true);
    });
  });

  describe("COORDINATOR", () => {
    it("can approve plans and publish grades", () => {
      expect(can("COORDINATOR", "plan:approve")).toBe(true);
      expect(can("COORDINATOR", "grade:publish")).toBe(true);
    });
    it("cannot manage memberships", () => {
      expect(can("COORDINATOR", "membership:manage")).toBe(false);
    });
  });

  describe("SCHOOL_ADMIN", () => {
    it("can close terms and read audit", () => {
      expect(can("SCHOOL_ADMIN", "term:close")).toBe(true);
      expect(can("SCHOOL_ADMIN", "audit:read")).toBe(true);
    });
    it("cannot enter grades directly", () => {
      expect(can("SCHOOL_ADMIN", "grade:enter")).toBe(false);
    });
    it("cannot write plans", () => {
      expect(can("SCHOOL_ADMIN", "plan:write")).toBe(false);
    });
  });

  describe("TEACHER", () => {
    it("can enter grades and write topics", () => {
      expect(can("TEACHER", "grade:enter")).toBe(true);
      expect(can("TEACHER", "topic:write")).toBe(true);
    });
    it("cannot close terms or read audit", () => {
      expect(can("TEACHER", "term:close")).toBe(false);
      expect(can("TEACHER", "audit:read")).toBe(false);
    });
    it("cannot manage memberships", () => {
      expect(can("TEACHER", "membership:manage")).toBe(false);
    });
  });

  describe("canAny / canAll", () => {
    it("canAny returns true if any action allowed", () => {
      expect(canAny("TEACHER", ["grade:enter", "term:close"])).toBe(true);
    });
    it("canAll returns false if any action not allowed", () => {
      expect(canAll("TEACHER", ["grade:enter", "term:close"])).toBe(false);
    });
    it("canAll returns true when all allowed", () => {
      expect(canAll("TEACHER", ["grade:enter", "topic:write"])).toBe(true);
    });
  });
});
