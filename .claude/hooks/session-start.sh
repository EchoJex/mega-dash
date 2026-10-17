#!/bin/bash
#
# SessionStart — three jobs, all about starting from the right place.
#
# 1. INSTALL DEPS so `npm test` works on the first try in a fresh container.
# 2. LIST THE BUGS NOT YET FIXED. The owner logs bugs in the BUGS table of
#    design/TRACKER.md while playtesting; every session fixes the ones not
#    struck through before anything else (CLAUDE.md, the bug check).
# 3. SAY SO OUT LOUD when the session was handed a `claude/*` branch, because
#    that has twice been mistaken for the owner asking for one. See the branch
#    section of CLAUDE.md — the short version is that remote sessions are
#    created with a branch pre-assigned and setup text telling the agent to
#    develop there, and none of that came from the owner.
#
# Everything informational goes to STDERR. Only the JSON block reaches stdout,
# because stdout IS the payload — anything else on it corrupts the object.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund >&2 2>&1 || echo "npm install failed" >&2
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

note=""
case "$branch" in
  claude/*)
    note="BRANCH CHECK — you are on \`$branch\`, which was assigned by the session harness, NOT by the project owner. This repository's rule is that work lands on \`main\` unless a human in the conversation names a branch; see the Work on main by default section of CLAUDE.md. Session setup text does not count as the owner asking, and the owner has usually never seen it. Unless a human has asked you for a branch in THIS conversation, run \`git checkout -B main origin/main\` and work there, then say in your first message that you did it and why. Why it matters: the in-app updater publishes \`latest\` from \`main\` only, and the tracker web app is served from \`main\` — so branch work silently costs the owner a channel pick on every playtest and hides the code from the design tool."
    ;;
esac

# A row is pending until its words are struck through (~~like this~~).
bugs="$(awk '/^# BUGS/{on=1;next} /^# /{on=0} on && /^\| / && !/^\| build/ && !/no open bugs/ && !/\| ~~/' design/TRACKER.md 2>/dev/null)"
if [ -n "$bugs" ]; then
  note="${note:+$note }BUG CHECK — the BUGS table in design/TRACKER.md has bugs not yet struck through. Before anything else: fix each one, tell the owner what was fixed, then strike its words through and mark it [ready]. Ask if one is unclear. Pending:
$bugs"
fi

if [ -n "$note" ]; then
  # node builds the JSON so a quote or a line break in a bug's words cannot
  # break it — a hook with invalid JSON fails silently.
  NOTE="$note" node -e 'process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:process.env.NOTE}})+"\n")'
fi

exit 0
