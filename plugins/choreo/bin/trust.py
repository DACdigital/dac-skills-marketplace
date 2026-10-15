"""Mark one worker folder as trusted in ~/.claude.json, as accepting the trust prompt would.

Arguments: the folder, and the project root it must sit under. Anything outside
the root is refused. Read, change one key, write back at once, so Claude Code's
own writes are not lost."""
import json, os, sys, tempfile

path = os.path.realpath(sys.argv[1])
allowed = os.path.realpath(sys.argv[2]) if len(sys.argv) > 2 else ""
if not allowed or not path.startswith(allowed + os.sep) or not os.path.isdir(path):
    sys.exit(f"refused: {path} is not a folder under {allowed or 'the project root'}")
conf = os.path.expanduser("~/.claude.json")
with open(conf) as fh:
    data = json.load(fh)
entry = data.setdefault("projects", {}).setdefault(path, {})
if entry.get("hasTrustDialogAccepted") is True:
    print("already trusted")
    sys.exit(0)
entry["hasTrustDialogAccepted"] = True
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(conf), prefix=".claude.json.")
with os.fdopen(fd, "w") as fh:
    json.dump(data, fh, indent=2)
os.chmod(tmp, os.stat(conf).st_mode & 0o777)
os.replace(tmp, conf)
print("trusted")
