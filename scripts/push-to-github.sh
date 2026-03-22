#!/usr/bin/env bash
# Create a public GitHub repository (if missing) and push the current branch.
#
#   export GITHUB_USER="your-github-username"
#   export GITHUB_TOKEN="ghp_xxxxxxxx"   # classic PAT with "repo" scope
#   bash scripts/push-to-github.sh        # optional: repo name (default: Lyfta-Clone)
#
# The remote URL is cleared of the token after a successful push.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${GITHUB_USER:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
  cat <<'EOF'
Set both environment variables, then run this script again:

  export GITHUB_USER="your-github-username"
  export GITHUB_TOKEN="ghp_xxxx"   # https://github.com/settings/tokens — classic token, "repo" scope

Optional first argument: repository name (default: Lyfta-Clone)

Or push manually after creating an empty repo on GitHub:

  git remote add origin https://github.com/USER/REPO.git
  git push -u origin master
EOF
  exit 1
fi

REPO_NAME="${1:-Lyfta-Clone}"
BRANCH="$(git branch --show-current)"

HTTP_CODE="$(curl -sS -o /tmp/gh-create-repo.json -w "%{http_code}" -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user/repos" \
  -d "{\"name\":\"${REPO_NAME}\",\"private\":false,\"auto_init\":false}")"

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "422" ]]; then
  echo "GitHub API returned HTTP ${HTTP_CODE}"
  cat /tmp/gh-create-repo.json
  exit 1
fi

if [[ "$HTTP_CODE" == "422" ]]; then
  echo "Repository may already exist (HTTP 422). Continuing with push…"
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

git push -u origin "${BRANCH}"

git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo ""
echo "Pushed branch '${BRANCH}' to https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo "Next: Netlify → Add site → Import from Git → pick this repo."
echo "Set build env VITE_API_BASE_URL to your deployed API origin (no trailing slash)."
