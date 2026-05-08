#!/bin/bash
# Check if an argument is provided
if [ -z "$1" ]; then
  echo "Error: VERSION argument is required."
  echo "Usage: $0 <VERSION>"
  exit 1
fi

# Assign the argument to the VERSION variable
VERSION=$1

echo "VERSION is set to: $VERSION"

# Check that VERSION matches the pattern x.x.x where x is a non-negative integer (allows 0)
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: VERSION must be in the format x.x.x where x is a non-negative integer (e.g., 0.1.2)"
  exit 1
fi

# List of package.json paths
FILES=(
  "./package.json"
)

# Update version in each package.json
for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    jq --arg version "$VERSION" '.version = $version' "$FILE" > temp.json && mv temp.json "$FILE"
    echo "Updated $FILE to version $VERSION"
  else
    echo "File not found: $FILE"
  fi
done

# Remove non-hidden contents while preserving dotfiles (e.g. .gitignore)
for DIR in "src/client/bower_components"; do
  if [ -d "$DIR" ]; then
    find "$DIR" -mindepth 1 -maxdepth 1 ! -name ".*" -exec rm -rf {} +
    echo "Cleaned non-hidden contents in $DIR"
  fi
done

npm install

git commit -am "Release $VERSION"
git tag "v$VERSION"

echo "✅ All went well!"
echo "Step 1: Push to GitHub with:"
echo ""
echo "git push origin main && git push origin v$VERSION"
echo ""
echo "Step 2: Publish pacakge to npm with:"
echo "npm publish"
echo ""
echo "Step 3: Create a new release on GitHub with:"
echo "https://github.com/webgme/webgme/releases/new?tag=v$VERSION"