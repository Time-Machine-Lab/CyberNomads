import { access, cp, mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_RUNTIME_SKILL_NAMES } from "../../../shared/agent-task-skill-instructions.js";
import type { RuntimePaths } from "../../storage/file-system/runtime-paths.js";

export interface RuntimeSkillAsset {
  name: string;
  directory: string;
  skillFile: string;
  openaiMetadataFile: string | null;
  referenceFiles: string[];
}

export interface RuntimeAgentAssetSyncOptions {
  bundledAgentDirectory?: string;
  ensureDirectory?: (
    path: string,
    options: { recursive: boolean },
  ) => Promise<unknown>;
  copyDirectory?: (
    source: string,
    destination: string,
    options: { recursive: boolean; force: boolean },
  ) => Promise<unknown>;
}

export async function resolveBundledRuntimeAgentDirectory(
  explicitDirectory?: string,
): Promise<string> {
  const candidateDirectories = explicitDirectory
    ? [resolve(explicitDirectory)]
    : getDefaultRuntimeAgentCandidates();

  for (const candidateDirectory of candidateDirectories) {
    try {
      await access(candidateDirectory);
      return candidateDirectory;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Failed to locate bundled runtime Agent assets. Searched: ${candidateDirectories.join(", ")}`,
  );
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

export async function resolveBundledRuntimeKnowledgeDirectory(
  explicitDirectory?: string,
): Promise<string> {
  const candidateDirectories = explicitDirectory
    ? [resolve(explicitDirectory)]
    : getDefaultRuntimeKnowledgeCandidates();

  for (const candidateDirectory of candidateDirectories) {
    try {
      await access(candidateDirectory);
      return candidateDirectory;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Failed to locate bundled runtime knowledge assets. Searched: ${candidateDirectories.join(", ")}`,
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

export async function resolveRuntimeInstalledSkillFile(
  runtimeSkillsDirectory: string,
  skillName: string,
): Promise<string> {
  const skillFile = resolve(runtimeSkillsDirectory, skillName, "SKILL.md");

  try {
    await access(skillFile);
    return skillFile;
  } catch (error) {
    throw new Error(
      `Failed to locate installed runtime Skill file "${skillName}".`,
      {
        cause: error,
      },
    );
  }
}

export async function resolveRuntimeInstalledKnowledgeFile(
  runtimeKnowledgeDirectory: string,
  knowledgeRelativePath: string,
): Promise<string> {
  const knowledgeFile = resolve(
    runtimeKnowledgeDirectory,
    knowledgeRelativePath,
  );

  try {
    await access(knowledgeFile);
    return knowledgeFile;
  } catch (error) {
    throw new Error(
      `Failed to locate installed runtime knowledge file "${knowledgeRelativePath}".`,
      {
        cause: error,
      },
    );
  }
}

export async function syncBundledRuntimeAgentAssets(
  runtimePaths: Pick<
    RuntimePaths,
    "agentDirectory" | "agentSkillsDirectory" | "agentKnowledgeDirectory"
  >,
  options: RuntimeAgentAssetSyncOptions = {},
): Promise<void> {
  const ensureDirectory =
    options.ensureDirectory ??
    (async (path: string, mkdirOptions: { recursive: boolean }) =>
      mkdir(path, mkdirOptions));
  const copyDirectory =
    options.copyDirectory ??
    (async (
      source: string,
      destination: string,
      copyOptions: { recursive: boolean; force: boolean },
    ) => cp(source, destination, copyOptions));
  const bundledAgentDirectory = await resolveBundledRuntimeAgentDirectory(
    options.bundledAgentDirectory,
  );
  const bundledSkillsDirectory = resolve(bundledAgentDirectory, "skills");
  const bundledKnowledgeDirectory = resolve(bundledAgentDirectory, "knowledge");

  await ensureDirectory(runtimePaths.agentDirectory, { recursive: true });
  await ensureDirectory(runtimePaths.agentSkillsDirectory, { recursive: true });
  await ensureDirectory(runtimePaths.agentKnowledgeDirectory, {
    recursive: true,
  });
  await copyDirectory(
    bundledSkillsDirectory,
    runtimePaths.agentSkillsDirectory,
    {
      recursive: true,
      force: true,
    },
  );
  await copyDirectory(
    bundledKnowledgeDirectory,
    runtimePaths.agentKnowledgeDirectory,
    {
      recursive: true,
      force: true,
    },
  );
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
    resolve(currentModuleDirectory, "../../../../runtime-assets/agent/skills"),
    resolve(currentModuleDirectory, "../../../runtime-assets/agent/skills"),
  ];
}

function getDefaultRuntimeKnowledgeCandidates(): string[] {
  const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));

  return [
    resolve(
      currentModuleDirectory,
      "../../../../runtime-assets/agent/knowledge",
    ),
    resolve(currentModuleDirectory, "../../../runtime-assets/agent/knowledge"),
  ];
}

function getDefaultRuntimeAgentCandidates(): string[] {
  const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));

  return [
    resolve(currentModuleDirectory, "../../../../runtime-assets/agent"),
    resolve(currentModuleDirectory, "../../../runtime-assets/agent"),
  ];
}

export async function readRuntimeSkillFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}
