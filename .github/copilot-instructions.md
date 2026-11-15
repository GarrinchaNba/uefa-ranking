# Repository-wide Copilot instructions

## Phase delivery

At the end of each implementation phase, after running the relevant validation and updating phase task/documentation status, create one dedicated commit containing that phase's changes and push it to the configured upstream branch. Do not combine work from separate phases in a commit.

Stage only files belonging to the completed phase. Use a descriptive commit message. Never amend an existing commit or force-push. If there is no configured upstream, the worktree contains unrelated changes that cannot safely be separated, or authentication/network issues prevent pushing, keep the dedicated local commit when safe and report the push blocker clearly.
