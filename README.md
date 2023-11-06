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
