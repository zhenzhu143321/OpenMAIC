#!/usr/bin/env node
/**
 * scripts/check-classroom-data.mjs
 *
 * Read-only audit of data/classrooms. Reports which classrooms are missing
 * ownerId / visibility, and shows what values readClassroom() would migrate them to.
 *
 * Usage:
 *   node scripts/check-classroom-data.mjs [--data-dir <path>]
 *   node scripts/check-classroom-data.mjs --data-dir /path/to/OpenMAIC/data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  let dataDir = path.join(projectRoot, 'data');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--data-dir' && argv[i + 1]) dataDir = argv[++i];
  }
  return { dataDir };
}

async function loadCourseClassroomIds(dataDir) {
  const coursesDir = path.join(dataDir, 'courses');
  const ids = new Set();
  try {
    const entries = await fs.readdir(coursesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.name.endsWith('.json')) continue;
      try {
        const content = await fs.readFile(path.join(coursesDir, entry.name), 'utf-8');
        const course = JSON.parse(content);
        for (const ch of course.chapters ?? []) {
          if (ch.classroomId) ids.add(ch.classroomId);
        }
      } catch { /* skip corrupt */ }
    }
  } catch { /* courses dir missing */ }
  return ids;
}

async function main() {
  const { dataDir } = parseArgs(process.argv.slice(2));

  console.error(`[check] scanning: ${path.join(dataDir, 'classrooms')}`);

  const referencedIds = await loadCourseClassroomIds(dataDir);
  const classroomsPath = path.join(dataDir, 'classrooms');

  let entries = [];
  try {
    entries = await fs.readdir(classroomsPath, { withFileTypes: true });
  } catch {
    console.error(`[check] classrooms dir not found: ${classroomsPath}`);
    process.exit(1);
  }

  const results = [];
  let missingOwner = 0;
  let missingVisibility = 0;
  let missingBoth = 0;

  for (const entry of entries) {
    let jsonPath = null;
    if (entry.isDirectory()) {
      jsonPath = path.join(classroomsPath, entry.name, 'classroom.json');
    } else if (entry.name.endsWith('.json')) {
      jsonPath = path.join(classroomsPath, entry.name);
    }
    if (!jsonPath) continue;

    let data;
    try {
      data = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    } catch { continue; }

    const id = data.id ?? entry.name.replace('.json', '');
    const hasOwner = Boolean(data.ownerId);
    const hasVisibility = Boolean(data.visibility);
    const legacy = !hasOwner || !hasVisibility;

    if (!hasOwner && !hasVisibility) missingBoth++;
    else if (!hasOwner) missingOwner++;
    else if (!hasVisibility) missingVisibility++;

    const wouldMigrateVisibility = !hasVisibility
      ? (referencedIds.has(id) ? 'course-bound' : 'standalone-published')
      : null;

    results.push({
      id,
      path: jsonPath,
      ownerId: data.ownerId ?? null,
      visibility: data.visibility ?? null,
      legacy,
      wouldMigrateOwner: !hasOwner ? 'admin (from ensureAdminExists)' : null,
      wouldMigrateVisibility,
      referencedByCourse: referencedIds.has(id),
    });
  }

  const report = {
    scannedAt: new Date().toISOString(),
    dataDir,
    total: results.length,
    healthy: results.filter(r => !r.legacy).length,
    legacy: results.filter(r => r.legacy).length,
    missingOwnerOnly: missingOwner,
    missingVisibilityOnly: missingVisibility,
    missingBoth,
    classrooms: results.sort((a, b) => (a.legacy ? 1 : -1) - (b.legacy ? 1 : -1)),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = `/tmp/classroom-data-check-${stamp}.json`;
  await fs.writeFile(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.error(`\n[check] report saved to: ${outPath}`);
  console.error(`[check] total: ${report.total}  healthy: ${report.healthy}  legacy: ${report.legacy}`);
}

main().catch(err => { console.error(err); process.exit(1); });
