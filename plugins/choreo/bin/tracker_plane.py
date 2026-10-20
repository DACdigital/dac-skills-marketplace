"""Print the user's open Plane work items as the JSON array the choreo plugin reads.

Arguments: Plane base URL, workspace slug, project id, and the name of the env variable
that holds the API key (default PLANE_API_KEY). The key is read from the environment only.
Lists the items assigned to the key's user whose state is not completed or cancelled.
Rank follows the state group (started, unstarted, backlog, triage), later states first.
"""
import json, os, sys, urllib.parse, urllib.request

url, ws, project = (sys.argv[1:4] + ["", "", ""])[:3]
key_env = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else "PLANE_API_KEY"
key = os.environ.get(key_env, "")
if not (url and ws and project):
    sys.exit("tracker_plane: set tracker.url, tracker.workspace and tracker.projectId in the config")
if not key:
    sys.exit(f"tracker_plane: the env variable {key_env} is not set")
url = url.rstrip("/")
api = f"{url}/api/v1"
base = f"{api}/workspaces/{urllib.parse.quote(ws)}/projects/{urllib.parse.quote(project)}"


def get(path, **query):
    q = urllib.parse.urlencode({k: v for k, v in query.items() if v not in (None, "")})
    req = urllib.request.Request(f"{path}{'?' + q if q else ''}", headers={"X-API-Key": key, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def pages(path, **query):
    """Every result of a list endpoint, plain list or cursor pages."""
    out, cursor = [], ""
    for _ in range(50):
        data = get(path, per_page=100, cursor=cursor, **query)
        if isinstance(data, list):
            return data
        out += data.get("results", [])
        cursor = data.get("next_cursor") or ""
        if not data.get("next_page_results") or not cursor:
            break
    return out


me = get(f"{api}/users/me/")["id"]
prefix = get(f"{base}/")["identifier"]
groups = {"started": 0, "unstarted": 1, "backlog": 2, "triage": 3}
states = {s["id"]: s for s in pages(f"{base}/states/") if s.get("group") in groups}
labels = {l["id"]: l["name"] for l in pages(f"{base}/labels/")}

items = []
for it in pages(f"{base}/work-items/", fields="sequence_id,name,state,assignees,priority,labels"):
    st = states.get(it.get("state"))
    if not st or me not in (it.get("assignees") or []):
        continue
    k = f"{prefix}-{it['sequence_id']}"
    items.append({
        "key": k,
        "title": it.get("name", ""),
        "state": st["name"],
        "url": f"{url}/{ws}/browse/{k}/",
        "labels": [labels[i] for i in it.get("labels") or [] if i in labels],
        "rank": groups[st["group"]] * 100000 - int(st.get("sequence") or 0),
        "priority": it.get("priority") or "none",
    })
json.dump(items, sys.stdout)
