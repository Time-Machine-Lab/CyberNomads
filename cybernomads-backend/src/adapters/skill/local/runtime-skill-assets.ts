import { access, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_RUNTIME_SKILL_NAMES } from "../../../shared/agent-task-skill-instructions.js";

export interface RuntimeSkillAsset {
  name: string;
  directory: string;
  skillFile: string;
  openaiMetadataFile: string | null;
  referenceFiles: string[];
}

export async function resolveBundledRuntimeSkillsDirectory(
  explicitDirectory?: string,
): Promise<string> {
  const candidateDirectories = explicitDirectory
    ? [resolve(explicitDirectory)]
    : getDefaultRuntimeSkillsCandidates();

  for (const candidateDirectory of candidateDirectories) {
    try {
      await access(candidateDirectory);
      return candidateDirectory;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Failed to locate bundled runtime Skill assets. Searched: ${candidateDirectories.join(", ")}`,
  );
}

export async function listBundledRuntimeSkills(
  runtimeSkillsDirectory?: string,
): Promise<RuntimeSkillAsset[]> {
  const skillsDirectory = await resolveBundledRuntimeSkillsDirectory(
    runtimeSkillsDirectory,
  );
  const skills: RuntimeSkillAsset[] = [];

  for (const skillName of REQUIRED_RUNTIME_SKILL_NAMES) {
    skills.push(await readRuntimeSkillAsset(skillsDirectory, skillName));
  }

  return skills;
}

async function readRuntimeSkillAsset(
  skillsDirectory: string,
  skillName: string,
): Promise<RuntimeSkillAsset> {
  const directory = resolve(skillsDirectory, skillName);
  const skillFile = resolve(directory, "SKILL.md");
  await access(skillFile);

  const openaiMetadataFile = await optionalPath(
    resolve(directory, "agents", "openai.yaml"),
  );
  const referenceDirectory = resolve(directory, "references");
  const referenceFiles = await listMarkdownFiles(referenceDirectory);

  return {
    name: skillName,
    directory,
    skillFile,
    openaiMetadataFile,
    referenceFiles,
  };
}

async function optionalPath(path: string): Promise<string | null> {
  try {
    await access(path);
    return path;
  } catch {
    return null;
  }
}

async function listMarkdownFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => resolve(directory, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function getDefaultRuntimeSkillsCandidates(): string[] {
  const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));

  return [
    resolve(currentModuleDirectory, "../../../../runtime-assets/skills"),
    resolve(currentModuleDirectory, "../../../runtime-assets/skills"),
  ];
}

export async function readRuntimeSkillFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}
