#!/usr/bin/env bash
# Example tracker command for the choreo plugin. It prints two made-up items.
#
# The contract. Set tracker.type to "command" and tracker.command to any shell command in .claude/choreo.json.
# The plugin runs it with bash -lc in the project root, every 5 minutes and on /choreo,
# with a 60 second timeout. The command must exit 0 and print one JSON array:
#
#   [
#     {
#       "key": "TASK-1",                      required, the item id
#       "title": "Short title",               required
#       "state": "In progress",               the group it shows under, default "open"
#       "url": "https://tracker.example/1",   optional, the key becomes a link
#       "labels": ["bug"],                    optional
#       "rank": 1,                            optional, a number, lower needs you sooner
#       "priority": "high"                    optional: urgent, high, medium, low or none
#     }
#   ]
#
# List only the items that are yours and open. A non-zero exit or output that is not a
# JSON array hides the My tasks tab and shows a toast.
# Read credentials from the environment. Never write a token into this file.
cat <<'JSON'
[
  {"key": "TASK-1", "title": "Add a health check endpoint", "state": "In progress", "url": "https://tracker.example/TASK-1", "labels": ["backend"], "rank": 1},
  {"key": "TASK-2", "title": "Write the release notes", "state": "Todo", "url": "https://tracker.example/TASK-2", "labels": [], "rank": 5}
]
JSON
