#!/usr/bin/env bash

set -e

# Script to check if files from specific pattern groups have changed in a PR
# Groups: backend, postgres, ui

changed_files=$(git diff --name-only "origin/$GITHUB_BASE_REF...HEAD")

if [ -z "$changed_files" ]; then
  echo "No files changed in this PR compared to $GITHUB_BASE_REF branch."
  echo "backend_changed=false" >> $GITHUB_OUTPUT
  echo "postgres_changed=false" >> $GITHUB_OUTPUT
  echo "ui_changed=false" >> $GITHUB_OUTPUT
  exit 0
fi

backend_changed=false
postgres_changed=false
ui_changed=false

for file in $changed_files; do
  if [[ $file == forge/* || 
        $file == test/unit/* || 
        $file == test/system/* || 
        $file == frontend/* || 
        $file == test/e2e/frontend/* || 
        $file == test/unit/frontend/* || 
        $file == package.json || 
        $file == package-lock.json || 
        $file == .eslintrc ]]; then
    backend_changed=true
  fi

  if [[ $file == forge/* || 
        $file == test/unit/* || 
        $file == test/system/* || 
        $file == package.json || 
        $file == package-lock.json ]]; then
    postgres_changed=true
  fi

  if [[ $file == forge/* || 
        $file == test/unit/* || 
        $file == test/system/* || 
        $file == frontend/* || 
        $file == test/e2e/frontend/* || 
        $file == test/unit/frontend/* || 
        $file == package.json || 
        $file == package-lock.json || 
        $file == .eslintrc ]]; then
    ui_changed=true
  fi
  
  if $backend_changed && $postgres_changed && $ui_changed; then
    break
  fi
done

echo "Changed groups:"
echo "  Backend: $backend_changed"
echo "  postgres: $postgres_changed"
echo "  UI: $ui_changed"

echo "backend_changed=$backend_changed" >> $GITHUB_OUTPUT
echo "postgres_changed=$postgres_changed" >> $GITHUB_OUTPUT
echo "ui_changed=$ui_changed" >> $GITHUB_OUTPUT

exit 0
