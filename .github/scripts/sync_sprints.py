#!/usr/bin/env python3
"""Mirror the Sprint iteration field from FlowFuse Development (#1) to Product (#3).

One run, in order:
 1. Reconcile #3's iteration set to #1's completed+active union (full replace only if
    the set differs, keyed on startDate+duration+title). A replace regenerates iteration
    IDs and clears item values, so step 4 always re-asserts every value to self-heal.
 2. Re-read #3 iteration map (startDate -> iterationId).
 3. Read every #1 item's Sprint value (issue content id -> startDate).
 4. Read every #3 item, and for each issue set/clear its Sprint to mirror #1.

Auth: GH_TOKEN env (GitHub App installation token in CI).
Set DRY_RUN=1 to log intended writes without mutating.
"""
import json, os, sys, urllib.request

DEV_PROJECT = "PVT_kwDOBNz_Ls0x7w"   # #1 Development
PROD_PROJECT = "PVT_kwDOBNz_Ls4ABDzU"  # #3 Product
DEV_FIELD = "PVTIF_lADOBNz_Ls0x784PFfJo"        # #1 "Sprint"
PROD_FIELD = "PVTIF_lADOBNz_Ls4ABDzUzhUAVpc"    # #3 "Sprint (auto-synced from Development)"
GQL = "https://api.github.com/graphql"
TOKEN = os.environ["GH_TOKEN"]
DRY = os.environ.get("DRY_RUN") == "1"


def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(GQL, data=body, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "GraphQL-Features": "projects_v2_iteration_field_configuration",
    })
    with urllib.request.urlopen(req) as r:
        out = json.load(r)
    if "errors" in out:
        raise RuntimeError(json.dumps(out["errors"], indent=2))
    return out["data"]


def sprint_config(field_id):
    """Iteration set for a field, keyed/sorted by startDate. Looked up by ID so the
    field can be renamed (e.g. the Product note) without breaking the sync."""
    d = gql("""
    query($id:ID!){ node(id:$id){ ... on ProjectV2IterationField {
      configuration { duration
        iterations{id title startDate duration}
        completedIterations{id title startDate duration} } } } }
    """, {"id": field_id})
    c = (d.get("node") or {}).get("configuration")
    if not c:
        return []
    union = {it["startDate"]: it for it in c["completedIterations"] + c["iterations"]}
    return [union[k] for k in sorted(union)]


def iter_items(project_id, field_id):
    """Yield (item_id, issue_content_id_or_None, sprint_value_or_None) for every item,
    selecting the Sprint value by field id rather than name."""
    cursor = None
    while True:
        d = gql("""
        query($id:ID!,$after:String){ node(id:$id){ ... on ProjectV2 {
          items(first:100, after:$after){
            pageInfo{ hasNextPage endCursor }
            nodes{ id
              content{ __typename ... on Issue{ id } ... on PullRequest{ id } }
              fieldValues(first:20){ nodes{ ... on ProjectV2ItemFieldIterationValue {
                iterationId startDate field{ ... on ProjectV2IterationField{ id } } } } } } } } } }
        """, {"id": project_id, "after": cursor})
        conn = d["node"]["items"]
        for n in conn["nodes"]:
            sv = next((v for v in n["fieldValues"]["nodes"]
                       if v and v.get("field", {}).get("id") == field_id), None)
            c = n.get("content")
            issue = c["id"] if c and c.get("__typename") == "Issue" else None
            yield n["id"], issue, sv
        if not conn["pageInfo"]["hasNextPage"]:
            break
        cursor = conn["pageInfo"]["endCursor"]


def set_value(field_id, item_id, iteration_id):
    if DRY:
        return
    gql("""
    mutation($p:ID!,$f:ID!,$i:ID!,$v:String!){ updateProjectV2ItemFieldValue(input:{
      projectId:$p, fieldId:$f, itemId:$i, value:{ iterationId:$v }}){ projectV2Item{ id } } }
    """, {"p": PROD_PROJECT, "f": field_id, "i": item_id, "v": iteration_id})


def clear_value(field_id, item_id):
    if DRY:
        return
    gql("""
    mutation($p:ID!,$f:ID!,$i:ID!){ clearProjectV2ItemFieldValue(input:{
      projectId:$p, fieldId:$f, itemId:$i}){ projectV2Item{ id } } }
    """, {"p": PROD_PROJECT, "f": field_id, "i": item_id})


def main():
    dev_iters = sprint_config(DEV_FIELD)
    prod_iters = sprint_config(PROD_FIELD)
    if not dev_iters:
        sys.exit("Development #1 Sprint field returned no iterations; aborting.")

    def sig(its):
        return [(i["startDate"], i["duration"], i["title"]) for i in its]

    # 1. reconcile iteration set (destructive full replace if differs)
    if sig(dev_iters) != sig(prod_iters):
        print(f"Iteration set differs ({len(prod_iters)} -> {len(dev_iters)}); rebuilding #3 config.")
        if not DRY:
            its = ",".join(
                '{startDate:"%s",duration:%d,title:%s}' % (i["startDate"], i["duration"], json.dumps(i["title"]))
                for i in dev_iters)
            gql('mutation{ updateProjectV2Field(input:{fieldId:"%s",iterationConfiguration:{startDate:"%s",duration:7,iterations:[%s]}}){ projectV2Field{ id } } }'
                % (PROD_FIELD, dev_iters[0]["startDate"], its))
            prod_iters = sprint_config(PROD_FIELD)
    else:
        print(f"Iteration set already in sync ({len(prod_iters)} iterations).")

    start_to_prod_iter = {i["startDate"]: i["id"] for i in prod_iters}

    # 3. dev: issue content id -> startDate
    dev_iter_start = {i["id"]: i["startDate"] for i in dev_iters}
    dev_assign = {}
    for _item, issue, sv in iter_items(DEV_PROJECT, DEV_FIELD):
        if sv and issue:
            start = sv.get("startDate") or dev_iter_start.get(sv.get("iterationId"))
            if start:
                dev_assign[issue] = start
    print(f"#1 issues with a Sprint: {len(dev_assign)}")

    # 4. mirror onto #3
    sets = clears = noops = missing = 0
    for item_id, issue, sv in iter_items(PROD_PROJECT, PROD_FIELD):
        if not issue:
            continue
        want_start = dev_assign.get(issue)
        cur_iter = (sv or {}).get("iterationId")
        if want_start is None:
            if cur_iter:
                clear_value(PROD_FIELD, item_id); clears += 1
            continue
        want_iter = start_to_prod_iter.get(want_start)
        if not want_iter:
            missing += 1; continue
        if cur_iter == want_iter:
            noops += 1
        else:
            set_value(PROD_FIELD, item_id, want_iter); sets += 1
    print(f"{'DRY-RUN ' if DRY else ''}sets={sets} clears={clears} noops={noops} unmatched_start={missing}")


if __name__ == "__main__":
    main()
