#!/bin/sh


function usage() {
   echo "Backport a PR to the `maintenance` branch, via a new PR"
   echo
   echo "USAGE"
   echo "  backport <#PR>"
   echo
   echo "ARGS"
   echo "  #PR: The PR number to backport"
   echo
   exit 1
}

if [ -z $1 ]
then
    usage
fi

CURRENT_BRANCH=`git branch --show-current`
TARGET_BRANCH=maintenance

PR=$1
PR_BRANCH=backport-$PR

if git show-ref --quiet refs/heads/$PR_BRANCH; then
    echo " - Branch '$PR_BRANCH' already exists - aborting"
    exit 1
fi

PR_DETAILS=`gh pr view $PR --json title,url,body,commits 2>/dev/null` 
if [ $? -ne 0 ]
then
    echo " - PR #$PR not found - aborting"
    exit 1
fi  

PR_TITLE=`printf '%s' "$PR_DETAILS" | jq -c .title | sed -e 's/^"//' -e 's/"$//'`
PR_BODY=`printf '%s' "$PR_DETAILS" | jq -c .body | sed -e 's/^"//' -e 's/"$//'`
PR_URL=`printf '%s' "$PR_DETAILS" | jq -c .url | sed -e 's/^"//' -e 's/"$//'`
PR_COMMITS=`printf '%s' "$PR_DETAILS" | jq -c '.commits[].oid' | sed -e 's/"//g'`

git checkout $TARGET_BRANCH
git checkout -b $PR_BRANCH

for x in $PR_COMMITS
do
   git cherry-pick $x
done

git push origin $PR_BRANCH

cat <<EOT > $PR_BRANCH".txt"
Backport of $PR_URL

---

$PR_BODY
EOT

gh pr create --title "$PR_TITLE (backport #$PR)" -F $PR_BRANCH".txt" -H $PR_BRANCH -B $TARGET_BRANCH

rm $PR_BRANCH".txt"

git checkout $CURRENT_BRANCH