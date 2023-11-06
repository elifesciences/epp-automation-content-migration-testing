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

const check = (url) => {
  const response = syncFetch(url);
  return response.ok;
};

const checkSections = (url) => ({
  path: url,
  results: ['']
    .map((sub) => ({
      subpath: sub,
      result: check(`${url}${sub}`),
    })),
});

const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts).filter((id) => /^[0-9]+$/.test(id));

// Function to chunk an array into smaller arrays of a specified size
function chunkArray(array, size) {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
}

// Chunk rppIds into batches of 20
const batches = chunkArray(rppIds, 10);

// Process each batch
batches.forEach((batch, i) => {
  const scenarios = batch
    .map((rppId) =>( { id: rppId, ...checkSections(`https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=${rppId}`) }));

  const organise = () => {
    const ok = scenarios.filter((scenario) => scenario.results.every((result) => result.result));
    const error = scenarios.filter((scenario) => scenario.results.some((result) => !result.result));

    return {
      ok: ok.length,
      success: ok.map((i) => i.id).join(','),
      error: error.length,
      log: error.length > 0 ? JSON.stringify(error) : ''
    }
  };

  console.log(`Batch ${i + 1} of ${batches.length}:`, organise());
});
