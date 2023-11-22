const syncFetch = require('sync-fetch');
const { readFileSync } = require('fs');
require('dotenv').config();

const fetchAndParseManuscripts = () => {
  try {
    return JSON.parse(readFileSync('manuscripts.json', 'utf8'))['manuscripts'];
  } catch (err) {
    const manuscriptsJsonUrl = process.env.MANUSCRIPTS_JSON || 'https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json';
    const manuscriptsJson = syncFetch(manuscriptsJsonUrl);
    return manuscriptsJson.json()['manuscripts'];
  }
}

const check = (url, version) => {
  const response = syncFetch(url);
  const found = response.text().match(/s3:\/\/[^"]+/g) ?? [];
  const unique = new Set(found).size;
  return {
    ok: response.ok,
    total: found.length,
    unique,
    diff: found.length - unique,
    ...(version > 0 ? { mismatch: (version > unique) } : {}),
  };
};

const checkSections = (rppId) => {
  const path = `https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=${rppId.match(/^\d+/)[0]}`
  return {
    path,
    result: check(path, rppId.includes('v') ? Number(rppId.match(/\d$/)[0]) : 0),
  }
};

const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts);

const latestVersions = rppIds
  .filter(id => id.includes('v'))
  .sort()
  .reduce((acc, rppId) => {
    const [id,] = rppId.split('v');
    if (!acc.length) {
      acc.push(rppId);
    } else {
      const previous = acc.pop();
      const [prevId,] = previous.split('v');
      if (prevId === id) {
        acc.push(rppId);
      } else {
        acc.push(previous, rppId)
      }
    }
    return acc;
  }, []);

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
const batches = chunkArray(latestVersions, 10);



// Process each batch
batches.forEach((batch, i) => {
  const scenarios = batch
    .map((rppId) =>( { id: rppId, ...checkSections(rppId) }));

  if (i === 0) {
    console.log('[');
  }

  scenarios.filter((scenario) => scenario.result.mismatch || scenario.result.diff !== 0).forEach((scenario, j) => {
    console.log(`${JSON.stringify(scenario, null, 2)}${i + j + 2 < batches.length + scenarios.length ? ',' : ''}`);
  });

  if (i + 1 === batches.length) {
    console.log(']');
  }
});
