### Instructions for Backstop visual comparison checks

This is a one off script to compare content between two deployed versions of EPP after content ingestion has been automated.

If you stumble upon this, it's probably only useful as a reference of what we did and how we did it.

To create your reference images run:

```shell
yarn generate-reference
```

To compare the production instance of EPP with the reference images:

```shell
yarn run-test
```

To generate references and test image comparisons against all the manuscripts, run:

```shell
yarn content-migration-run
```

After the above is run you can check to see how many have passed and failed and then dig into the batch reports:

```shell
for file in $(ls ./backstop_data_run/**/**/jsonReport.json | sort -V); do fail_count=$(jq '[.tests[] | select((.pair.diff.rawMisMatchPercentage // 0) > 0)] | length' "$file"); pass_count=$(jq '[.tests[] | select((.pair.diff.rawMisMatchPercentage // 0) == 0)] | length' "$file"); fail_no_diff=$(jq '[.tests[] | select(.status == "fail" and (.pair.diff.rawMisMatchPercentage // 0) == 0)] | length' "$file"); match=$(echo "$file" | grep -oP '\d+-of-\d+' | head -n 1); echo "$match: $pass_count passes, $fail_count fails, $fail_no_diff false fails"; done
```

To reduce the feedback loop and if you want to focus on specific manuscripts then you can create a manuscripts.json file in the root of this project. See this example:

```json
{
  "manuscripts": {
    "86961v2": {}
  }
}
```

### Instructions to verify all content is published

To simply monitor whether the expected manuscripts are available without performing a visual comparison:

```shell
yarn content-status
```

### Instructions to verify that correct meca files are used

#### Step 1. Download csv from Data Hub DocMaps API

- Visit Data Hub DocMaps API in lookerstudio.google.com
- Expand menu:

![Expand menu](/README-files/docmap-mecas-1.png)

- Choose export:

![Choose export](/README-files/docmap-mecas-2.png)

- Rename to `docmap-mecas.csv` and confirm export:

![Rename and confirm export](/README-files/docmap-mecas-3.png)

- Move downloaded `docmap-mecas.csv` to root of this repo
- You will need to repeat this step to compare against the latest values in DataHub

#### Step 2. Run the script
- Run `yarn meca-status > meca-status.txt`
- You can monitor progress with `tail -f meca-status.txt`

#### Step 3. Evaluate results
- To see how many meca's match in docmaps and enhanced-preprints-data:

```shell
cat meca-status.txt | grep -E ',match,'
cat meca-status.txt | grep -E ',match,' | wc -l
```

- To see how many meca's are different in docmaps to enhanced-preprints-data:

Published only:
```shell
cat meca-status.txt | grep -E ',published,.+,different,'
cat meca-status.txt | grep -E ',published,.+,different,' | wc -l
```

All:
```shell
cat meca-status.txt | grep -E ',different,'
cat meca-status.txt | grep -E ',different,' | wc -l
```

- To see how many meca's are missing in Docmaps:

Published only:
```shell
cat meca-status.txt | grep -E ',published,.+,missing,'
cat meca-status.txt | grep -E ',published,.+,missing,' | wc -l
```

All:
```shell
cat meca-status.txt | grep -E ',missing,'
cat meca-status.txt | grep -E ',missing,' | wc -l
```

### Instructions to verify status of automated instance of Journal API

To monitor whether the reviewed-preprints API that serves Journal is displays all expected results:

```shell
yarn journal-api-status
```
