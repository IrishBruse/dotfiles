#!/bin/bash

# --- CONFIGURATION ---
# Change this to your GitHub Organization name
ORG="YOUR_ORG_NAME"

# Determine date format (macOS vs Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    SINCE=$(date -v-1d +%Y-%m-%d)
else
    SINCE=$(date --date="yesterday" +%Y-%m-%d)
fi

echo "🔍 Gathering activity for $ORG since $SINCE..."

# 1. Collect the data into a variable
ACTIVITY_LOG=$(cat <<EOF
--- COMMITS ---
$(gh search commits --owner="$ORG" --author="@me" --committer-date=">$SINCE" --json repository,commit --jq '.[] | "[\(.repository.name)] \(.commit.message)"')

--- PULL REQUESTS ---
$(gh search issues --owner="$ORG" --author="@me" --is:pr --updated=">$SINCE" --json title,repository,url --jq '.[] | "[\(.repository.name)] \(.title) (\(.url))"')
EOF
)

# 2. Print the raw info for you to see
echo -e "\n======================= RAW DATA SENT TO AI ======================="
echo "$ACTIVITY_LOG"
echo -e "===================================================================\n"

# 3. Print the separator and call the Cursor Agent
echo "🤖 AGENT SUMMARY:"
echo "-------------------------------------------------------------------"

Prompt=$(cat <<EOF
You are a senior engineer's assistant.
Based on these commit messages and PRs, write a concise daily standup summary.
Use a professional yet conversational tone.
Group by project/repository.
Highlight accomplishments and keep it brief enough for a Slack message.
EOF
)

echo "$ACTIVITY_LOG" | cursor-agent -p $Prompt
