import { describe, expect, it } from "vitest";
import { branchGroupByValue, branchGroupIndexForProgram, BRANCH_GROUP_PREFIX, programMatchesBranchGroup } from "@/lib/constants";

describe("branch groups", () => {
  it("clubs CSE, AI, DS and IT style programs together", () => {
    const group = branchGroupByValue(`${BRANCH_GROUP_PREFIX}computer-ai-data-it`);
    expect(group).toBeDefined();
    expect(programMatchesBranchGroup("Computer Science and Engineering (Artificial Intelligence)", group!)).toBe(true);
    expect(programMatchesBranchGroup("Artificial Intelligence and Data Science", group!)).toBe(true);
    expect(programMatchesBranchGroup("Information Technology", group!)).toBe(true);
  });

  it("places ECE style programs before unrelated groups", () => {
    expect(branchGroupIndexForProgram("Electronics and Communication Engineering")).toBeLessThan(
      branchGroupIndexForProgram("Mechanical Engineering")
    );
  });
});
