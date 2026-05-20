export interface SkillRegistryEntry {
  name: string;
  summary: string;
  skillFile: string;
}

export interface SkillRegistryPort {
  listSkills(): Promise<SkillRegistryEntry[]>;
  readSkillSummary(skillName: string): Promise<SkillRegistryEntry | null>;
}
