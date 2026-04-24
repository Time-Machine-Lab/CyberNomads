'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const skillRoot = path.resolve(__dirname, '..');
const scriptsRoot = path.join(skillRoot, 'scripts');

function readAllJsFiles(rootPath) {
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const nextPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...readAllJsFiles(nextPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(nextPath);
    }
  }
  return files.sort();
}

test('skill scripts do not reference old runtime, store, or session modules', () => {
  const files = readAllJsFiles(scriptsRoot);
  const forbiddenTokens = [
    'session-store',
    'runtime/bootstrap',
    'runtime/context',
    'runtime/paths',
    'node:sqlite',
    'insertOperationRecord',
    'cooldown',
    'dedupe',
    'createRuntimeContext',
  ];

  for (const filePath of files) {
    const body = fs.readFileSync(filePath, 'utf8');
    for (const token of forbiddenTokens) {
      assert.equal(
        body.includes(token),
        false,
        `${path.relative(skillRoot, filePath)} unexpectedly references ${token}`
      );
    }
  }
});

test('dependency reference stays aligned with package metadata', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(skillRoot, 'package.json'), 'utf8'));
  const dependencyRef = fs.readFileSync(path.join(skillRoot, 'references', 'dependencies.md'), 'utf8');

  assert.equal(pkg.name, 'bilibili-web-api');
  assert.equal(pkg.engines.node, '>=22.13');
  assert.equal(Object.prototype.hasOwnProperty.call(pkg.dependencies, 'qrcode'), true);
  assert.equal(dependencyRef.includes('>=22.13'), true);
  assert.equal(dependencyRef.includes('qrcode'), true);
});
