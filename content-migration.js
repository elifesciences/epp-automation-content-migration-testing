const syncFetch = require('sync-fetch');
const { readFileSync } = require('fs');

const offset = process.env.MIGRATION_OFFSET ? parseInt(process.env.MIGRATION_OFFSET) : 0;
const checks = process.env.MIGRATION_CHECKS ? parseInt(process.env.MIGRATION_CHECKS) : 20;
const removeSelectors = process.env.MIGRATION_REMOVE_SELECTORS ? process.env.MIGRATION_REMOVE_SELECTORS.split(',') : [];
const report = process.env.MIGRATION_REPORT ? process.env.MIGRATION_REPORT.split(',') : ['browser'];
const reportPathRoot = process.env.MIGRATION_REPORT_PATH ? process.env.MIGRATION_REPORT_PATH : 'backstop_data';

const config = {
  id: 'enhanced_article',
  viewports: [
    {
      label: 'desktop',
      width: 1440,
      height: 900,
    },
  ],
  // onBeforeScript: 'playwright/onBefore.js',
  // onReadyScript: 'playwright/onReady.js',
  scenarios: [],
  paths: {
    bitmaps_reference: `${reportPathRoot}/bitmaps_reference`,
    bitmaps_test: `${reportPathRoot}/bitmaps_test`,
    engine_scripts: `${reportPathRoot}/engine_scripts`,
    html_report: `${reportPathRoot}/html_report`,
    json_report: `${reportPathRoot}/json_report`,
    ci_report: `${reportPathRoot}/ci_report`,
  },
  report: report,
  engine: 'playwright',
  engineOptions: {
    browser: 'chromium',
    gotoParameters: { waitUntil: 'networkidle0' },
    args: ['--no-sandbox'],
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false,
  misMatchThreshold: 0,
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

const scenarios = rppIds.slice(offset, offset + checks)
  .map((rppId) => ({
    label: `Enhanced Article ${rppId}`,
    url: `https://prod-automation--epp.elifesciences.org/reviewed-preprints/${rppId}`,
    referenceUrl: `https://migration-test--epp.elifesciences.org/reviewed-preprints/${rppId}`,
    removeSelectors: [...[
      '#CybotCookiebotDialog',
      '#assessment>.descriptors',
      'img', // removing images because of lazy load issue
      '.article-flag-list', // consider generating a report to surface differences between subject area order and list (https://migration-test--epp.elifesciences.org/reviewed-preprints/84141v1 https://prod-automation--epp.elifesciences.org/reviewed-preprints/84141v1)
      '#copyright', // different approach taken in automated setup (acceptable difference)
      'aside', // consider generating a report to surface date differences between migration-test and prod-automation (sent for peer review different https://migration-test--epp.elifesciences.org/reviewed-preprints/80494 https://prod-automation--epp.elifesciences.org/reviewed-preprints/80494)
      // '.author-list__orcids', // REGRESSION content difference - 80494 orcids don't appear in prod-automation article and author information (https://prod-automation--epp.elifesciences.org/reviewed-preprints/80494#author-list)
    ], ...removeSelectors],
    delay: 1000,
  }));

config.scenarios = scenarios;

module.exports = config;
