# Description

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

If `status` is fail but no difference has been detected then we consider this to be a pass but indicate it as a "false fail".

To reduce the feedback loop and if you want to focus on specific manuscripts then you can create a manuscripts.json file in the root of this project. See this example:

```json
{
  "manuscripts": {
    "86961v2": {}
  }
}
```

To simply monitor whether the expected manuscripts are available without performing a visual comparison:

```shell
yarn content-status
```
