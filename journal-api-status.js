const syncFetch = require('sync-fetch');

const semiAutomatedUrl = 'https://prod--gateway.elifesciences.org/reviewed-preprints';
const automatedUrl = 'https://prod-automation--epp.elifesciences.org/api/reviewed-preprints';
const batchSize = 50;

const fetchSnippets = (url, page, perPage) => {
  const results = syncFetch(`${url}?order=asc&page=${page}&per-page=${perPage}`);
  return results.json();
};

const semiAutomatedTotal = parseInt(fetchSnippets(semiAutomatedUrl, 1)['total'], 10);
const automatedTotal = parseInt(fetchSnippets(automatedUrl, 1)['total'], 10);

const semiAutomatedSnippets = [];
const automatedSnippets = [];

let page = 1;
console.log(`Collecting semi-automated snippets (${semiAutomatedTotal})`);
while (semiAutomatedSnippets.length < semiAutomatedTotal) {
  console.log(`gathering page ${page} of ${Math.ceil(semiAutomatedTotal / batchSize)}`);
  semiAutomatedSnippets.push(...fetchSnippets(semiAutomatedUrl, page, batchSize)['items']);
  page++;
}
console.log(`Completed collection of semi-automated snippets!`);

page = 1;
console.log(`Collecting automated snippets (${automatedTotal})`);
while (automatedSnippets.length < automatedTotal) {
  console.log(`gathering page ${page} of ${Math.ceil(automatedTotal / batchSize)}`);
  automatedSnippets.push(...fetchSnippets(automatedUrl, page, batchSize)['items']);
  page++;
}
console.log(`Completed collection of automated snippets!`);

const semiAutomatedSnippetsMsids = semiAutomatedSnippets.map((snippet) => snippet.id);
const automatedSnippetsMsids = automatedSnippets.map((snippet) => snippet.id);

const msidsOnlyInSemiAutomated = semiAutomatedSnippetsMsids.filter((msid) => !automatedSnippetsMsids.includes(msid));
const msidsOnlyInAutomated = automatedSnippetsMsids.filter((msid) => !semiAutomatedSnippetsMsids.includes(msid));
const msidsInBoth = semiAutomatedSnippetsMsids.filter((msid) => automatedSnippetsMsids.includes(msid));

console.log(`msidsInBoth: (${msidsInBoth.length})`);
console.log(`msidsOnlyInSemiAutomated (${msidsOnlyInSemiAutomated.length}): ${msidsOnlyInSemiAutomated.join(',')}`);
console.log(`msidsOnlyInAutomated (${msidsOnlyInAutomated.length}): ${msidsOnlyInAutomated.join(',')}`);
