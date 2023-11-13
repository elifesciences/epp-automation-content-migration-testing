const syncFetch = require('sync-fetch');
const { readFileSync } = require('fs');

const fetchAndParseManuscripts = () => {
  try {
    return JSON.parse(readFileSync('manuscripts.json', 'utf8'))['manuscripts'];
  } catch (err) {
    const manuscriptsJson = syncFetch('https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json');
    return manuscriptsJson.json()['manuscripts'];
  }
}

const responseIsOK = async (url, id = '') => {
  const response = await fetch(url);
  return {
    id: `checkResponseIsOK-${id}`,
    url,
    result: response.ok
  };
};

const checkDocmapApi = async (scenario) => {
  // skip versioned scenarios
  if (scenario.id.includes('v')) {
    return scenario;
  }
  const url = `https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=${scenario.id}`;
  const response = await fetch(url);
  const docmap = await response.text();
  return {
    ...scenario,
    results: [
      ...scenario.results,
      {
        id: 'checkDocmapContainsS3Path',
        url,
        result: docmap.includes('s3://'),
      }
    ]
  };
}

const checkBasicUrls = async (scenario) => ({
  ...scenario,
  results: [
    ...scenario.results,
    ...await Promise.all(
      [
        [`https://staging--epp.elifesciences.org/reviewed-preprints/${scenario.id}`, 'MainPage'],
        [`https://staging--epp.elifesciences.org/reviewed-preprints/${scenario.id}/figures`, 'FiguresPage'],
        [`https://staging--epp.elifesciences.org/reviewed-preprints/${scenario.id}/reviews`, 'ReviewsPage'],
        [`https://staging--epp.elifesciences.org/api/preprints/${scenario.id}`, 'API'],
      ].map((urlCheckData) => responseIsOK(...urlCheckData)),
    ),
  ]
})

const checkAPI = async (scenario) => {
  const url = `https://staging--epp.elifesciences.org/api/preprints/${scenario.id}`;
  const response = await fetch(url);

  return {
    ...scenario,
    results: [
      ...scenario.results,
      response.ok ? {
          id: 'checkPublishedDate',
          url,
          result: true,
          publishedDate: response.json().article?.published ?? null,
        } : {
          id: 'checkPublishedDate',
          url,
          result: false,
          message: `request failed: ${response.status}: ${await response.text()}`
        },
    ]
  };
};

// Function to chunk an array into smaller arrays of a specified size
const chunkArray = (array, size) => {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
}

const batchAndCheck = async (rppIds, batchSize) => {
  // Chunk rppIds into batches of 20
  const batches = chunkArray(rppIds, batchSize);

  // Process each batch
  for (const i in batches) {
    const batch = batches[i];
    const scenarios = batch.map((rppId) => ({ id: rppId, results: []}));
    const checkedScenarios = await Promise.all(scenarios.map(checkBasicUrls));

    const ok = checkedScenarios.filter((scenario) => scenario.results.every((result) => result.result));
    const error = checkedScenarios.filter((scenario) => scenario.results.some((result) => !result.result));

    const enhancedFailedScenarios = await Promise.all(error.map(async (scenario) => {
      return checkAPI(scenario)
        .then(checkDocmapApi);
    }));

    const output = JSON.stringify({
      batchId: `Batch ${parseInt(i) + 1} of ${batches.length}`,
      ok: ok.length,
      success: ok.map((i) => i.id).join(','),
      error: enhancedFailedScenarios.length,
      log: enhancedFailedScenarios,
    }, null, 2);

    console.log(output);
  }
}


const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts);
batchAndCheck(rppIds, 10);
