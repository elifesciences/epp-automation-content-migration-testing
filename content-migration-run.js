const syncFetch = require('sync-fetch');
const { readFileSync, rmSync, existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const batchSize = 10;
const batchesFolder = 'backstop_data_run';
const maxRetries = 3;
const fails = [];

// Remove the batchesFolder directory if it exists
if (existsSync(batchesFolder)) {
  console.log(`Removing folder: ${batchesFolder}`);
  rmSync(batchesFolder, { recursive: true });
}

const fetchAndParseManuscripts = () => {
  try {
    return JSON.parse(readFileSync('manuscripts.json', 'utf8'))['manuscripts'];
  } catch (err) {
    const manuscriptsJson = syncFetch('https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json');
    return manuscriptsJson.json()['manuscripts'];
  }
}

const manuscripts = fetchAndParseManuscripts();
let rppIds = Object.keys(manuscripts);

try {
  const excludes = JSON.parse(readFileSync('excludes.json', 'utf8'));

  if (excludes.length) {
    rppIds = rppIds.filter((id) => !excludes.includes(id));
  }
}
 catch (e) {
  console.log('no excludes found');
}

const batches = Math.ceil(rppIds.length / batchSize);

let retries = 0;

for (let i = 0; i < batches; i++) {
  // If retries have reached the maximum, throw an error and exit
  if (retries >= maxRetries) {
    console.error(`Failed to generate report for batch ${i + 1} of ${batches} after ${maxRetries} attempts.`);
    process.exit(1);
  }

  console.log(`Batch ${i + 1} of ${batches}`);

  // Set environment variables
  process.env.MIGRATION_OFFSET = (i * batchSize).toString();
  process.env.MIGRATION_CHECKS = (batchSize).toString();
  process.env.MIGRATION_REMOVE_SELECTORS = '.author-list__orcids,#copyright';
  process.env.MIGRATION_REPORT = 'json';
  process.env.MIGRATION_REPORT_PATH = `${batchesFolder}/${i + 1}-of-${batches}`;

  try {
    // Run `yarn generate-report`
    execSync('backstop reference --config=content-migration.js', {stdio: 'inherit'});

    // Run `yarn run-test`
    execSync('backstop test --config=content-migration.js', {stdio: 'inherit'});
  } catch (error) {
    // Check if the json_report folder exists
    if (!existsSync(path.join(process.env.MIGRATION_REPORT_PATH, 'json_report'))) {
      console.log(`json_report folder not found in ${process.env.MIGRATION_REPORT_PATH}, retry in 3 seconds...`);

      // Wait for 3 seconds
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);

      // Increment retries
      retries++;

      // Decrement i by 1
      i--;

      continue;
    }

    fails.push(`Some failures found in batch ${i + 1} of ${batches} (${process.env.MIGRATION_REPORT_PATH}). Re-run: ${[
      `MIGRATION_OFFSET=${process.env.MIGRATION_OFFSET}`,
      `MIGRATION_CHECKS=${process.env.MIGRATION_CHECKS}`,
      `MIGRATION_REMOVE_SELECTORS="${process.env.MIGRATION_REMOVE_SELECTORS}"`,
      `MIGRATION_REPORT="${process.env.MIGRATION_REPORT}"`,
      `MIGRATION_REPORT_PATH="${process.env.MIGRATION_REPORT_PATH}"`,
      'bash -c',
      '"yarn generate-reference &&',
      'yarn run-test"',
    ].join(' ')}`);
  } finally {
    // Unset environment variables
    delete process.env.MIGRATION_OFFSET;
    delete process.env.MIGRATION_CHECKS;
    delete process.env.MIGRATION_REMOVE_SELECTORS;
    delete process.env.MIGRATION_REPORT;
    delete process.env.MIGRATION_REPORT_PATH;

    // Reset retries
    retries = 0;
  }
}

console.log(`Report${batches > 1 ? 's' : ''} complete!`);

if (fails.length > 0) {
  console.log(`Failures found in ${fails.length} of ${batches} batches!`);
  fails.forEach((f) => { console.log(f); });
}
