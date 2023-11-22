total_passes=0
total_fails=0
failed_manuscripts=()

for file in $(ls ./backstop_data_run/**/**/jsonReport.json | sort -V); do
    fail_count=$(jq '[.tests[] | select((.pair.diff.rawMisMatchPercentage // 0) > 0)] | length' "$file")
    pass_count=$(jq '[.tests[] | select((.pair.diff.rawMisMatchPercentage // 0) == 0)] | length' "$file")
    fail_no_diff=$(jq '[.tests[] | select(.status == "fail" and (.pair.diff.rawMisMatchPercentage // 0) == 0)] | length' "$file")
    match=$(echo "$file" | grep -oP '\d+-of-\d+' | head -n 1)

    echo "$match: $pass_count passes, $fail_count fails, $fail_no_diff false fails"

    total_passes=$((total_passes + pass_count))
    total_fails=$((total_fails + fail_count))
    total_fails_no_diff=$((total_fails_no_diff + fail_no_diff))

    # Extract the manuscript IDs of the failed tests
    failed_tests=$(jq -r '[.tests[] | select((.pair.diff.rawMisMatchPercentage // 0) > 0) .pair.label] | join(",")' "$file")
    IFS=',' read -ra ids <<< "$failed_tests"
    for id in "${ids[@]}"; do
        # Extract the manuscript ID from the label
        manuscript_id=$(echo "$id" | grep -oP '(?<=Enhanced Article ).*')
        failed_manuscripts+=("$manuscript_id")
    done
done

echo "Total passes: $total_passes"
echo "Total fails: $total_fails"
echo "Total false fails: $total_fails_no_diff"

# Output the manuscript IDs of the failed tests
echo "Failed manuscripts: $(IFS=','; echo "${failed_manuscripts[*]}")"
