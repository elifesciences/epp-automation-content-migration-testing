const syncFetch = require('sync-fetch');
const { readFileSync } = require('fs');

const fetchAndParseManuscripts = () => {
  try {
    return JSON.parse(readFileSync('manuscripts.json', 'utf8'))['manuscripts'];
  } catch (err) {
    const manuscriptsJsonUrl = process.env.MANUSCRIPTS_JSON || 'https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json';
    const manuscriptsJson = syncFetch(manuscriptsJsonUrl);
    return manuscriptsJson.json()['manuscripts'];
  }
}

const check = (url) => {
  const response = syncFetch(url);
  return response.ok;
};

const checkSections = (url) => ({
  path: url,
  results: ['', '/figures', '/reviews']
    .map((sub) => ({
      subpath: sub,
      result: check(`${url}${sub}`),
    })),
});

const checkPublished = (rppId) => {
  const response = syncFetch(`https://prod--epp.elifesciences.org/api/preprints/${rppId}`);
  if (!response.ok) {
    return `request failed: ${response.status}: ${response.text()}`;
  }

  const articleJson = response.json();
  return articleJson.article.published;
}

const checkContent = (msid, version) => {
  const response = syncFetch(`https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=${msid}`);
  const found = response.text().match(/s3:\/\/[^"]+/g) ?? [];
  const unique = new Set(found).size;
  return { total: found.length, unique, ...(version > 0 ? { mismatch: (version > unique) } : {}) };
}

const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts).filter((rppId) => rppId.indexOf('v') > 0);

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

// Chunk rppIds into batches of 10
const batches = chunkArray(rppIds, 10);

// Process each batch
batches.forEach((batch, i) => {
  const scenarios = batch
    .map((rppId) =>( { id: rppId, ...checkSections(`https://prod-automation--epp.elifesciences.org/reviewed-preprints/${rppId}`) }));

  const organise = () => {
    const ok = scenarios.filter((scenario) => scenario.results.every((result) => result.result));
    const error = scenarios.filter((scenario) => scenario.results.some((result) => !result.result));

    return {
      ok: ok.length,
      success: ok.map((i) => i.id).join(','),
      error: error.length,
      log: error,
    }
  };

  console.log(JSON.stringify({
    batch: `${i + 1} of ${batches.length}`,
    ...organise()
  }, null, 2));
});
