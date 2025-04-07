from github import Github
import requests
import os

# ========== CONFIG ==========
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")  # or paste it as a string
REPO_NAME = "rtyley/small-test-repo"  # e.g., "torvalds/linux"
MAX_COMMITS = 50  # adjust for how far back you want to go
# ============================

g = Github(GITHUB_TOKEN)
repo = g.get_repo(REPO_NAME)

# ----- Step 1: Get Commit Messages and SHAs -----
commits = repo.get_commits()
commit_data = []

print(f"Fetching up to {MAX_COMMITS} commits...")

for i, commit in enumerate(commits):
    if i >= MAX_COMMITS:
        break
    sha = commit.sha
    message = commit.commit.message
    commit_data.append({
        "sha": sha,
        "message": message
    })

print(f"Collected {len(commit_data)} commit messages.")

# ----- Step 2: Get Micro (diff) + Macro (snapshot) for each commit -----
headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3.diff"
}

micro_diffs = []
macro_snapshots = []

for c in commit_data:
    sha = c["sha"]
    print(f"Processing commit {sha}...")

    # Micro code evolution: get raw diff
    diff_url = f"https://api.github.com/repos/{REPO_NAME}/commits/{sha}"
    diff_resp = requests.get(diff_url, headers=headers)
    if diff_resp.status_code == 200:
        micro_diffs.append({
            "sha": sha,
            "diff": diff_resp.text
        })

    # Macro codebase snapshot: get tree recursively
    commit_obj = repo.get_commit(sha)
    tree = repo.get_git_tree(commit_obj.commit.tree.sha, recursive=True)
    file_snapshot = {}
    for item in tree.tree:
        if item.type == "blob":
            try:
                file_content = repo.get_contents(item.path, ref=sha).decoded_content.decode("utf-8", errors="ignore")
                file_snapshot[item.path] = file_content
            except:
                file_snapshot[item.path] = "[Binary or Unavailable]"

    macro_snapshots.append({
        "sha": sha,
        "files": file_snapshot
    })

print("Done collecting data!")

# Example: Save results
import json

with open("commit_messages.json", "w") as f:
    json.dump(commit_data, f, indent=2)

with open("micro_diffs.json", "w") as f:
    json.dump(micro_diffs, f, indent=2)

with open("macro_snapshots.json", "w") as f:
    json.dump(macro_snapshots, f, indent=2)

print("Saved output to JSON files.")

