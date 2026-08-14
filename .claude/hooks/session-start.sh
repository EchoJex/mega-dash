#!/bin/bash
#
# SessionStart — two jobs, both about starting from the right place.
#
# 1. INSTALL DEPS so `npm test` works on the first try in a fresh container.
# 2. SAY SO OUT LOUD when the session was handed a `claude/*` branch, because
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

if [ -n "$note" ]; then
  # jq is not guaranteed here, so the payload is assembled with printf. The note
  # above must therefore contain NO double quotes, newlines or backslashes —
  # an early draft used "quoted" words and produced invalid JSON, which a hook
  # fails silently on. Backticks are fine and are what the markdown uses.
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$note"
fi

exit 0
