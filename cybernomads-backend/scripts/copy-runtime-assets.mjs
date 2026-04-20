import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const sourceDirectory = resolve(projectRoot, "runtime-assets");
const targetDirectory = resolve(projectRoot, "dist", "runtime-assets");

await mkdir(resolve(projectRoot, "dist"), { recursive: true });
await cp(sourceDirectory, targetDirectory, {
  recursive: true,
  force: true,
});
