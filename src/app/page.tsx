import Image from "next/image";
import { analyzeRepoData } from "../lib/analyzeRepoData";
import { Octokit } from "@octokit/rest";
import { Commit } from "../types/commit";

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
              diff
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
  
  // Fetch commits - server-side data fetching
  const commits: Commit[] = await getRepoCommits("xkjjx", "csce315-personal-portfolio", process.env.GITHUB_TOKEN);

  // Function to format date in a readable way
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // const commitsAnalysis = await analyzeRepoData(commits);
  // console.log(commitsAnalysis)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Repository Commit History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Viewing commits for <span className="font-medium">xkjjx/csce315-personal-portfolio</span>
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {commits.length > 0 ? (
            <div className="space-y-6">
              {commits.map((commit, index) => (
                <div key={index} className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {commit.commitMessage.split('\n')[0]}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Committed by <span className="font-medium">{commit.author}</span> on {formatDate(commit.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  {commit.commitMessage.split('\n').length > 1 && (
                    <div className="border-t border-gray-200 px-4 py-3 sm:px-6 bg-gray-50">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {commit.commitMessage.split('\n').slice(1).join('\n')}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200">
                    <details className="group">
                      <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          View diff
                        </div>
                      </summary>
                      <div className="px-4 py-3 bg-gray-50 text-xs overflow-x-auto">
                        <pre className="whitespace-pre font-mono text-gray-800">{commit.diff}</pre>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m0 16v1m-8-8h1m15 0h1m-9-9l1 1m-1 13l1-1m-13-5l1 1m16-1l-1 1m-9-9l1 1m-1 13l1-1m-13-5l1 1m16-1l-1 1" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No commits found</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no commits in this repository or an error occurred while fetching them.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}