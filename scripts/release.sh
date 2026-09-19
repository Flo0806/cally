#!/bin/bash
set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.1.0"
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$ ]]; then
  echo "Error: version must be semver (e.g. 0.1.0 or 0.1.0-alpha.1)"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working directory not clean. Commit or stash changes first."
  exit 1
fi

TAG="v${VERSION}"

echo "Releasing cally $TAG"

# update version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

git add package.json
git commit -m "release: v${VERSION}"
git tag "$TAG"

# load token from .env if available
if [ -z "$GH_TOKEN" ] && [ -f .env ]; then
  source .env
fi

# push
if [ -n "$GH_TOKEN" ]; then
  REMOTE="https://Flo0806:${GH_TOKEN}@github.com/Flo0806/cally.git"
  git push "$REMOTE" main
  git push "$REMOTE" "$TAG"
else
  git push origin main
  git push origin "$TAG"
fi

echo ""
echo "Done! GitHub Action will build and push the Docker image."
