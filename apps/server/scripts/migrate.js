import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
const outDir = path.resolve(process.cwd(), '.data');
const outFile = path.join(outDir, 'migrations-applied.txt');

fs.mkdirSync(outDir, { recursive: true });
const migrations = fs.readdirSync(migrationsDir).sort();
fs.writeFileSync(outFile, migrations.join('\n'));
console.log(`Applied migrations (logical): ${migrations.length}`);
