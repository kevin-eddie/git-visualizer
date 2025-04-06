import Image from "next/image";
import { Octokit } from "@octokit/rest";

interface Commit {
  timestamp: Date,
  author: string,
  commitMessage: string,
  diff: string
}

export default async function Home() {
  /**
     * Fetches the commit history for a GitHub repository
     * @param owner The repository owner (username or organization)
     * @param repo The repository name
     * @param token GitHub personal access token (optional but recommended)
     * @returns Promise containing an array of Commit objects
     */
  async function getRepoCommits(owner: string, repo: string, token?: string): Promise<Commit[]> {
    try {
      const octokit = new Octokit({
        auth: token
      });

      let page = 1;
      let hasMoreCommits = true;
      const commits: Commit[] = [];

      while (hasMoreCommits) {
        try {
          const response = await octokit.repos.listCommits({
            owner,
            repo,
            per_page: 100,
            page: page++
          });

          if (response.data.length === 0) {
            hasMoreCommits = false;
            continue;
          }

          for (const commit of response.data) {
            const authorName = commit.author?.login || commit.commit.author?.name || 'Unknown';
            const date = new Date(commit.commit.author?.date || '');
            const message = commit.commit.message;

            const diff = await getCommitDiff(octokit, owner, repo, commit.sha).catch((e) => {
              return "";
            })

            commits.push({
              timestamp: date,
              author: authorName,
              commitMessage: message,
              diff // TODO The basic listCommits endpoint doesn't include diffs, would need separate API call
            });
          }

        } catch (error) {
          console.error('Error fetching commits:', error);
          hasMoreCommits = false;
        }
      }

      return commits;

    } catch (error: any) {
      console.error('Error accessing repository:', error);
      
      // Provide helpful error message for rate limiting
      if (error.status === 403 && error.headers?.['x-ratelimit-remaining'] === '0') {
        console.error('GitHub API rate limit exceeded. Please use a personal access token.');
      }
      
      // Return empty array if there's an error
      return [];
    }
  }

  async function getCommitDiff(
    octokit: Octokit,
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<string> {
    // Get commit to find parent SHA
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });
  
    if (!commit.parents || commit.parents.length === 0) {
      throw new Error("This appears to be the first commit in the repository with no parent commits.");
    }
  
    const baseSha = commit.parents[0].sha;
  
    // Use SDK to compare commits (structured response)
    const { data: comparison } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${baseSha}...${commitSha}`,
    });
  
    // Build a simple unified diff-like output
    let diffOutput = `Comparing ${baseSha}...${commitSha}\n\n`;
  
    for (const file of comparison.files ?? []) {
      diffOutput += `diff --git a/${file.filename} b/${file.filename}\n`;
      diffOutput += `--- a/${file.filename}\n`;
      diffOutput += `+++ b/${file.filename}\n`;
      diffOutput += file.patch ?? "(no patch available)\n";
      diffOutput += `\n`;
    }
  
    return diffOutput;
  }
  

  let commits: Commit[] = await getRepoCommits("xkjjx", "csce315-personal-portfolio", process.env.GITHUB_TOKEN);

  for (const commit of commits) {
    console.log(commit.author)
    console.log(commit.timestamp)
    console.log(commit.diff)
  }

  return (<div>
    Hello world!
  </div>
  );
}
