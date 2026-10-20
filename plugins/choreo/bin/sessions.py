"""List recent Claude Code sessions of one project as JSON, newest first.

Arguments: query (may be empty), limit, project root. Claude Code keeps each
project's transcripts under ~/.claude/projects/<slug>, where the slug is the
path with every character that is not a letter or digit replaced by "-".
The trailing * also takes the project's worktrees and nested repos."""
import glob, json, os, re, sys

query = (sys.argv[1] if len(sys.argv) > 1 else "").lower()
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 15
project = os.path.realpath(sys.argv[3] if len(sys.argv) > 3 else os.getcwd())
slug = re.sub(r"[^A-Za-z0-9]", "-", project)
root = os.path.expanduser("~/.claude/projects")
files = glob.glob(os.path.join(root, glob.escape(slug) + "*", "*.jsonl"))
files.sort(key=os.path.getmtime, reverse=True)
out = []
for path in files:
    title, cwd, first = None, None, None
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"customTitle"' in line or (cwd is None and '"cwd"' in line) or (first is None and '"queue-operation"' in line):
                    try:
                        row = json.loads(line)
                    except ValueError:
                        continue
                    if row.get("type") == "custom-title":
                        title = row.get("customTitle") or title
                    if cwd is None and row.get("cwd"):
                        cwd = row["cwd"]
                    if first is None and row.get("type") == "queue-operation" and row.get("content"):
                        first = str(row["content"])[:160]
    except OSError:
        continue
    item = {
        "sessionId": os.path.basename(path)[:-6],
        "title": title,
        "cwd": cwd,
        "firstPrompt": first,
        "modified": int(os.path.getmtime(path)),
    }
    hay = " ".join(str(v) for v in item.values() if v).lower()
    if query and query not in hay:
        continue
    out.append(item)
    if len(out) >= limit:
        break
print(json.dumps(out))
