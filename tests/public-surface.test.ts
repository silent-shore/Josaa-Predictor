import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function listFiles(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path).flatMap((entry) => {
    const entryPath = join(path, entry);
    return statSync(entryPath).isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

describe("public website surface", () => {
  it("does not expose admin website routes or navigation", () => {
    const root = process.cwd();
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf-8");
    expect(layout).not.toContain("Admin");
    expect(layout).not.toContain("/admin");
    expect(listFiles(join(root, "app/admin"))).toEqual([]);
    expect(listFiles(join(root, "app/api/admin"))).toEqual([]);
  });

  it("uses the professional JoSAA source notice", () => {
    const disclaimer = readFileSync(join(process.cwd(), "components/disclaimer.tsx"), "utf-8");
    expect(disclaimer).toContain("compiled from publicly available");
    expect(disclaimer).toContain("parsing or data-entry errors may occur");
  });
});
