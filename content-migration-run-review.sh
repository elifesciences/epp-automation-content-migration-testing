#!/bin/bash
set -e

total_passes=0
total_fails=0
passed_manuscripts=()
failed_manuscripts=()

script_dir="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
folder_path=$(realpath ${1:-${script_dir}/backstop_data_run})

for file in $(ls $folder_path/**/**/jsonReport.json | sort -V); do
    fail_count=$(jq '[.tests[] | select(.status == "fail")] | length' "$file")
    pass_count=$(jq '[.tests[] | select(.status == "pass")] | length' "$file")
    match=$(echo "$file" | grep -oP '\d+-of-\d+' | head -n 1)

    echo "$match: $pass_count passes, $fail_count fails"

    total_passes=$((total_passes + pass_count))
    total_fails=$((total_fails + fail_count))

    # Extract the manuscript IDs of the passed tests
    passed_tests=$(jq -r '[.tests[] | select(.status == "pass") .pair.label] | join(",")' "$file")
    IFS=',' read -ra ids <<< "$passed_tests"
    for id in "${ids[@]}"; do
        # Extract the manuscript ID from the label
        manuscript_id=$(echo "$id" | grep -oP '(?<=Enhanced Article ).*')
        passed_manuscripts+=("$manuscript_id")
    done

    # Extract the manuscript IDs of the failed tests
    failed_tests=$(jq -r '[.tests[] | select(.status == "fail") .pair.label] | join(",")' "$file")
    IFS=',' read -ra ids <<< "$failed_tests"
    for id in "${ids[@]}"; do
        # Extract the manuscript ID from the label
        manuscript_id=$(echo "$id" | grep -oP '(?<=Enhanced Article ).*')
        failed_manuscripts+=("$manuscript_id")
    done
done

echo "Total passes: $total_passes"
echo "Total fails: $total_fails"

# Output the manuscript IDs of the passed tests
echo "Passed manuscripts: $(IFS=','; echo "${passed_manuscripts[*]}")"

# Output the manuscript IDs of the failed tests
echo "Failed manuscripts: $(IFS=','; echo "${failed_manuscripts[*]}")"
