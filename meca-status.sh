#!/bin/bash
set -e

# ./meca-status.sh id uuid [version] [source] [datahub_docmap_csv]

# Check if we need to run with ggrep
grep_cli=grep
if ! grep --version | grep 'GNU grep'; then
  if type ggrep; then
    grep_cli=ggrep
  else
    echo "Couldn't find GNU grep on either grep or ggrep. If running on macos, run brew install grep"
    exit 1
  fi
fi

SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

id=$1
uuid=$2
version="${3-1}" # default 1
source="${4-biorxiv}" # default biorxiv
datahub_docmap_csv="$(realpath ${5-${SCRIPT_DIR}/docmap-mecas.csv})" # default ./docmap-mecas.csv

rp_line=$($grep_cli -m 1 "^${id},${version}," ${datahub_docmap_csv} || true)

# Split rp_line into an array
IFS=',' read -ra rp_array <<< "$rp_line"

match=""
biorxiv=""
datahub_uuid=""

if [[ $source == "biorxiv" ]]; then
  if [[ -n $rp_line ]]; then
    # Get the filename from the path
    filename=$(basename "${rp_array[8]}")
    # Remove the extension
    datahub_uuid="${filename%.*}"

    # Check if uuid is found in meca path
    if echo "${rp_array[8]}" | $grep_cli -Fq "/$uuid."; then
      match="match"
    else
      match="different"
    fi

    biorxiv="https://api.biorxiv.org/meca_index/elife/${rp_array[3]}"
  else
    match="missing"
  fi
fi

echo "${id},${version},${uuid},${source},${match},${datahub_uuid},${biorxiv}"
