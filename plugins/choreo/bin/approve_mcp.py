"""Prepare a worker worktree's .claude/settings.local.json (gitignored):
- approve the .mcp.json servers it can see, so it does not stop at "new MCP servers found".
Prints the approved server names, comma separated. The plugin passes them again with
--settings at launch, together with crossSessionInbound (Claude Code ignores that one here)."""
import json, os, sys

root = sys.argv[1]
# Claude Code also finds .mcp.json in parent folders (the main repo above a nested one)
names = []
d = os.path.realpath(root)
while True:
    mcp = os.path.join(d, ".mcp.json")
    if os.path.isfile(mcp):
        try:
            servers = json.load(open(mcp)).get("mcpServers", {})
        except ValueError:
            servers = {}
        names += [n for n in servers if n not in names]
    if d == os.path.dirname(d):
        break
    d = os.path.dirname(d)
path = os.path.join(root, ".claude", "settings.local.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
data = json.load(open(path)) if os.path.isfile(path) else {}
have = data.get("enabledMcpjsonServers", [])
data["enabledMcpjsonServers"] = have + [n for n in names if n not in have]
data.pop("crossSessionInbound", None)
with open(path, "w") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
print(", ".join(data["enabledMcpjsonServers"]))
