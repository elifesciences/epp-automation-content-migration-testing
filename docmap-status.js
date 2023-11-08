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
console.log(rppIds);

const latestVersions2 = rppIds
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

// Chunk rppIds into batches of 20
const batches = chunkArray(rppIds, 10);

// Process each batch
batches.forEach((batch, i) => {
  const scenarios = batch
    .map((rppId) =>( { id: rppId, ...checkSections(rppId) }));

  console.log(`Batch ${i + 1} of ${batches.length}:`, JSON.stringify(scenarios, null, 2));
});
