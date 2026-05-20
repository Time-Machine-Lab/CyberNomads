import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import type {
  SkillRegistryEntry,
  SkillRegistryPort,
} from "../../../ports/skill-registry-port.js";

export class FileSystemSkillRegistry implements SkillRegistryPort {
  constructor(private readonly skillsDirectory: string) {}

  async listSkills(): Promise<SkillRegistryEntry[]> {
    const entries = await readdir(this.skillsDirectory, {
      withFileTypes: true,
    });
    const skills: SkillRegistryEntry[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillFile = join(this.skillsDirectory, entry.name, "SKILL.md");

      try {
        const skillStats = await stat(skillFile);

        if (!skillStats.isFile()) {
          continue;
        }

        const content = await readFile(skillFile, "utf8");
        skills.push({
          name: entry.name,
          skillFile,
          summary: extractSkillSummary(content),
        });
      } catch {}
    }

    return skills.sort((left, right) => left.name.localeCompare(right.name));
  }

  async readSkillSummary(skillName: string): Promise<SkillRegistryEntry | null> {
    const normalizedSkillName = skillName.trim();

    if (normalizedSkillName.length === 0) {
      return null;
    }

    return (
      (await this.listSkills()).find((skill) => skill.name === normalizedSkillName) ??
      null
    );
  }
}

function extractSkillSummary(content: string): string {
  const descriptionMatch = /^description:\s*(.+)$/m.exec(content);

  if (descriptionMatch?.[1]) {
    return descriptionMatch[1].trim();
  }

  const firstParagraph = content
    .split(/\r?\n\r?\n/)
    .map((part) => part.replace(/^#+\s*/gm, "").trim())
    .find((part) => part.length > 0);

  return firstParagraph ?? "Cybernomads Skill.";
}
