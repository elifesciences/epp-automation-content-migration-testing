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
  results: ['', '/figures', '/reviews']
    .map((sub) => ({
      subpath: sub,
      result: check(`${url}${sub}`),
    })),
});

const checkPublished = (rppId) => {
  const response = syncFetch(`https://staging--epp.elifesciences.org/api/preprints/${rppId}`);
  if (!response.ok) {
    return `request failed: ${response.status}: ${response.text()}`;
  }

  const articleJson = response.json();
  return articleJson.article.published;
}

const checkContent = (msid) => {
  const response = syncFetch(`http://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id\?manuscript_id\=${msid}`);
  const text = response.text();

  const contentPresent = text.includes('s3://');

  return { id: msid, contentPresent };
}

const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts);

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
    .map((rppId) =>( { id: rppId, published: checkPublished(rppId), ...checkSections(`https://staging--epp.elifesciences.org/reviewed-preprints/${rppId}`) }));

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

  console.log(`Batch ${i + 1} of ${batches.length}:`, JSON.stringify(organise(), null, 2));
});

// batches.map((batch) => {
//   const batchResult = batch
//     .filter(msid => !msid.includes('v'))
//     .map(checkContent)
//     .filter(result => !result.contentPresent);
//
//   console.log(batchResult);
// })
