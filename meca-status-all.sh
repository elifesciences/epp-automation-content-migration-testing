#!/bin/bash
set -e

# ./meca-status-all.sh [datahub_docmap_csv] [manuscripts.json]

SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

datahub_docmap_csv="$(realpath ${1-${SCRIPT_DIR}/docmap-mecas.csv})" # default ./docmap-mecas.csv

if [[ -n $2 ]]; then
  # Load the contents of the file into manuscripts_json_txt
  manuscripts_json=$(cat "$(realpath $2)")
else
  # Store the content of the URL in manuscripts_json_txt
  manuscripts_json=$(curl -s "https://raw.githubusercontent.com/elifesciences/enhanced-preprints-client/master/manuscripts.json")
fi

# Get the latest commit hash
latest_commit=$(curl -s "https://api.github.com/repos/elifesciences/enhanced-preprints-data/git/refs/heads/master" | jq -r '.object.sha')

# Use the latest commit hash in the URL and store the output in a variable
paths_output=$(curl -s "https://api.github.com/repos/elifesciences/enhanced-preprints-data/git/trees/$latest_commit?recursive=1" | jq -r '.tree[] | select(.path | endswith("source.txt")) | .path')

# Read the paths_output variable into an array
IFS=$'\n' paths=($paths_output)

# Define the base_url
base_url="https://raw.githubusercontent.com/elifesciences/enhanced-preprints-data/master/"

# Initialize a counter
counter=1

# Prefix the base_url to each value and store them in the array
for path in "${paths[@]}"; do
  uuid=$(curl -s "${base_url}${path}" | head -n 1)

  # Check if uuid matches the regex
  if [[ $uuid =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    source="biorxiv"
  else
    source="non-biorxiv"
  fi

  id=$(echo $path | grep -oP '[0-9]+/v[0-9]+' | tr -d '/')

  if echo "$manuscripts_json" | grep -q "\"${id}\":"; then
    published="published"
  else
    published="preview"
  fi

  # Split the id into manuscriptId and version
  IFS='v' read -ra parts <<< "$id"
  manuscript_id=${parts[0]}
  version=${parts[1]}

  # Print a result
  echo "${counter}/${#paths[@]},${published},$($SCRIPT_DIR/meca-status.sh $manuscript_id $uuid $version $source $datahub_docmap_csv)"

  # Increment the counter
  ((counter++))
done
