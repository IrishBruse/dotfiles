#!/usr/bin/env node
const { execSync } = require("child_process");

/**
 * CONFIGURATION
 * Adjust these paths if your CLIs are not in your global PATH
 */
const CONFIG = {
  // If you use "New Outlook" (the web-style view), AppleScript may fail.
  // "Legacy Outlook" works best.
  OUTLOOK_APP_NAME: "Microsoft Outlook",
  JIRA_CMD: "jira", // Assumes 'jira' is in your PATH
  GIT_DIR: process.cwd(), // Scans the current folder for git commits
};

// --- HELPERS ---

function run(command, options = {}) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      ...options,
    }).trim();
  } catch (e) {
    return null;
  }
}

// --- COLLECTORS ---

// 1. Git Commits (Local)
function getGitCommits() {
  console.error("Scanning Git..."); // stored in stderr so it doesn't pollute output
  const cmd = `git log --since="midnight" --author="$(git config user.name)" --pretty=format:"- [%h] %s"`;
  return run(cmd, { cwd: CONFIG.GIT_DIR }) || "No commits today.";
}

// 2. GitHub PRs (via `gh` CLI)
function getGithubPRs() {
  console.error("Scanning GitHub...");
  // Searches for PRs involved with today
  const cmd = `gh search prs --author "@me" --updated >=$(date +%Y-%m-%d) --json title,url,state --template '{{range .}}- [{{.state}}] {{.title}} ({{.url}})\n{{end}}'`;
  return run(cmd) || "No active PRs found today.";
}

// 3. Jira Tickets (via `jira` CLI)
function getJiraTickets() {
  console.error("Scanning Jira...");
  // This assumes you have the standard 'jira' CLI installed and authenticated
  // We use JQL to find anything assigned to you updated in the last 24h
  const jql = "assignee = currentUser() AND updated >= -1d";
  const cmd = `${CONFIG.JIRA_CMD} issue list --jql "${jql}" --template "{{range .}}- {{.key}}: {{.summary}} ({{.status.name}})\n{{end}}"`;

  // Fallback: If --template isn't supported by your specific jira version, try basic list
  const basicCmd = `${CONFIG.JIRA_CMD} issue list --jql "${jql}"`;

  return (
    run(cmd) ||
    run(basicCmd) ||
    "No Jira tickets found or Jira CLI not configured."
  );
}

// 4. Outlook Calendar (via AppleScript)
function getOutlookEvents() {
  console.error("Scanning Outlook...");
  // AppleScript to talk to local Outlook App
  const script = `
    tell application "${CONFIG.OUTLOOK_APP_NAME}"
        set todayStart to (current date)
        set time of todayStart to 0
        set todayEnd to todayStart + (24 * 60 * 60)

        try
            set myEvents to (every calendar event where start time is greater than or equal to todayStart and start time is less than todayEnd)
            set output to ""
            repeat with anEvent in myEvents
                set output to output & "- " & (subject of anEvent) & " (" & (time string of (start time of anEvent)) & ")\\n"
            end repeat
            return output
        on error
            return "Unable to access Outlook (Check permissions or if 'New Outlook' is enabled)"
        end try
    end tell
    `;

  return run(`osascript -e '${script}'`) || "No meetings found today.";
}

// --- MAIN ---

function main() {
  const data = {
    date: new Date().toLocaleDateString(),
    commits: getGitCommits(),
    prs: getGithubPRs(),
    jira: getJiraTickets(),
    calendar: getOutlookEvents(),
  };

  const output = `
# 📝 DAILY WORK SUMMARY (${data.date})

## 📅 Meetings (Outlook)
${data.calendar}

## 🎫 Jira Activity
${data.jira}

## 🐙 GitHub PRs
${data.prs}

## 💻 Git Commits (Current Repo)
${data.commits}

## 💬 Slack
(Manual Check Required - Check 'Mentions & Reactions')
`;

  console.log(output);
}

main();
