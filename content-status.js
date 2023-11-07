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

const check = async (url) => {
  const response = await fetch(url);
  return response.ok;
};

const checkSections = async (url) => ({
  path: url,
  results: await Promise.all(
    ['', '/figures', '/reviews']
    .map(async (sub) => ({
      subpath: sub,
      result: await check(`${url}${sub}`),
    }))
  ),
});

const checkPublished = async (rppId) => {
  const response = await fetch(`https://prod--epp.elifesciences.org/api/preprints/${rppId}`);
  if (!response.ok) {
    return `request failed: ${response.status}: ${await response.text()}`;
  }

  const articleJson = response.json();
  return articleJson?.article?.published ?? null;
}


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
    const scenarios = await Promise.all(batch
      .map(async (rppId) => ({ id: rppId, published: await checkPublished(rppId), ...(await checkSections(`https://prod-automation--epp.elifesciences.org/reviewed-preprints/${rppId}`)) })));

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

    console.log(`Batch ${parseInt(i) + 1} of ${batches.length}:`, JSON.stringify(organise(), null, 2));
  }
}


const manuscripts = fetchAndParseManuscripts();
const rppIds = Object.keys(manuscripts);
batchAndCheck(rppIds, 10);
