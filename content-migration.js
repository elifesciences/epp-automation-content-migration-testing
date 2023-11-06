const syncFetch = require('sync-fetch');
const { readFileSync } = require('fs');

const config = {
  id: 'enhanced_article',
  viewports: [
    {
      label: 'desktop',
      width: 1440,
      height: 900
    }
  ],
  // onBeforeScript: 'playwright/onBefore.js',
  // onReadyScript: 'playwright/onReady.js',
  scenarios: [],
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report'
  },
  report: ['browser'],
  engine: 'playwright',
  engineOptions: {
    browser: 'chromium',
    gotoParameters: { waitUntil: 'networkidle0' },
    args: ['--no-sandbox']
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false
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
const rppIds = Object.keys(manuscripts);

const scenarios = rppIds.slice(0, 20)
  .map((rppId) => ({
    label: `Enhanced Article ${rppId}`,
    url: `https://prod-automation--epp.elifesciences.org/reviewed-preprints/${rppId}`,
    referenceUrl: `https://prod--epp.elifesciences.org/reviewed-preprints/${rppId}`,
    removeSelectors: ["#CybotCookiebotDialog", "#assessment>.descriptors"]
  }));

config.scenarios = scenarios;

module.exports = config;
