const syncFetch = require("sync-fetch");

const config = {
  id: 'enhanced_article',
  viewports: [
    {
      label: 'phone',
      width: 320,
      height: 480
    },
    {
      label: 'tablet',
      width: 1024,
      height: 768
    },
    {
      label: 'desktop',
      width: 1440,
      height: 900
    }
  ],
  onBeforeScript: 'playwright/onBefore.js',
  onReadyScript: 'playwright/onReady.js',
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
  const manuscriptsJson = syncFetch('https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json');
  const manuscripts = manuscriptsJson.json();
  return manuscripts;
}

const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts.manuscripts);

const scenarios = rppIds.map((rppId) => ({
  label: `Enhanced Article ${rppId}`,
  url: `https://prod-automation--epp.elifesciences.org/reviewed-preprints/${rppId}`,
  referenceUrl: `https://prod--epp.elifesciences.org/reviewed-preprints/${rppId}`,
  removeSelectors: ["#CybotCookiebotDialog", "#assessment>.descriptors"]
}))

config.scenarios = scenarios;

module.exports = config;
