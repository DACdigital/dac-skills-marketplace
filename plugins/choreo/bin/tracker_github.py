"""Print the user's open GitHub issues as the JSON array the choreo plugin reads.

Argument: a comma list of owner/repo. Empty means the repo of the current folder.
Uses the gh CLI, logged in with `gh auth login`. Lists open issues assigned to the user.
The state is "In progress" for an issue with the label "in progress", else "Open".
"""
import json, subprocess, sys

repos = [r.strip() for r in (sys.argv[1] if len(sys.argv) > 1 else "").split(",") if r.strip()] or [""]
items = []
for repo in repos:
    cmd = ["gh", "issue", "list", "--assignee", "@me", "--state", "open", "--limit", "100", "--json", "number,title,url,labels"]
    if repo:
        cmd += ["-R", repo]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"tracker_github: {out.stderr.strip()[:200]}")
    name = repo.split("/")[-1] if repo else ""
    for it in json.loads(out.stdout or "[]"):
        labels = [l["name"] for l in it.get("labels") or []]
        busy = any(l.lower() == "in progress" for l in labels)
        items.append({
            "key": f"{name}#{it['number']}" if name else f"#{it['number']}",
            "title": it["title"],
            "state": "In progress" if busy else "Open",
            "url": it["url"],
            "labels": labels,
            "rank": 0 if busy else 1,
        })
json.dump(items, sys.stdout)
