"use client";
import { analyzeRepoData } from "../lib/analyzeRepoData";
import { Octokit } from "@octokit/rest";
import Commit from "../types/commit";
import CommitCards from "../components/CommitCards"
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { RepoAnalysis } from "../types/repoAnalysis";
import RepoAnalysisComponent from "@/components/RepoAnalysisComponent";
import RepoInformation from "@/types/repoInformation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
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
  
  async function fetchUserRepositories(token: string) {
    setIsLoadingRepos(true);
    try {
      const octokit = new Octokit({
        auth: token
      });
      
      let page = 1;
      let hasMoreRepos = true;
      const repos: Array<RepoInformation> = [];

      while (hasMoreRepos) {
        const response = await octokit.repos.listForAuthenticatedUser({
          per_page: 100,
          page: page++,
          sort: 'created'
        });
        
        if (response.data.length === 0) {
          hasMoreRepos = false;
          continue;
        }
        
        response.data.forEach(repo => {
          repos.push({
            owner: repo.owner.login,
            repo: repo.name
          });
        });
      }
      
      page = 1;
      hasMoreRepos = true;
      while (hasMoreRepos) {
        const response = await octokit.activity.listReposStarredByAuthenticatedUser({
          per_page: 100,
          page: page++
        });
        
        if (response.data.length === 0) {
          hasMoreRepos = false;
          continue;
        }
        
        response.data.forEach(repo => {
          const exists = repos.some(
            r => r.owner === repo.owner.login && r.repo === repo.name
          );
          
          if (!exists) {
            repos.push({
              owner: repo.owner.login,
              repo: repo.name
            });
          }
        });
      }
      
      setRepos(repos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setIsLoadingRepos(false);
    }
  }

  const [commits, setCommits] = useState<Commit[]>([]);
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoInformation | null>(null);
  const [repos, setRepos] = useState<Array<RepoInformation>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);

  const { data: session } = useSession();

  const handleRepoChange = (value: string) => {
    if (!value) {
      setSelectedRepo(null);
      return;
    }
    
    const [selectedOwner, selectedRepo] = value.split('/');
    setSelectedRepo({owner: selectedOwner, repo: selectedRepo});
  };

  useEffect(() => {
    if (session?.accessToken) {
      setIsLoadingRepos(true);
      fetchUserRepositories(session.accessToken);
      setIsLoadingRepos(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && selectedRepo) {
      setCommits([]);
      setRepoAnalysis(null);
      getRepoCommits(selectedRepo.owner, selectedRepo.repo, session.accessToken).then(setCommits);
    }
  }, [session, selectedRepo]);

  useEffect(() => {
    if (commits.length > 0) {
      analyzeRepoData(commits).then(setRepoAnalysis);
    }
  }, [commits]);

  return (
    <div className="min-h-screen bg-gray">
      <header className="bg-white sm:rounded-lg m-4">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Git Visualizer</h1>
          
          <div className="mt-4 mb-2">
            <label htmlFor="repo-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Repository:
            </label>
            <Select 
              value={selectedRepo ? `${selectedRepo.owner}/${selectedRepo.repo}` : ""} 
              onValueChange={handleRepoChange}
              disabled={isLoadingRepos}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={repos.length === 0 ? "Loading repositories..." : "Select a repository"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {repos.map((repo) => (
                    <SelectItem 
                      key={`${repo.owner}/${repo.repo}`} 
                      value={`${repo.owner}/${repo.repo}`}
                    >
                      {repo.owner}/{repo.repo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {
            (!session) && (
              <div className="mt-4 mb-2">
                Please sign in to analyze your repository.
              </div>
            )
          }
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {selectedRepo ? (
            <>
              {repoAnalysis && <RepoAnalysisComponent repoAnalysis={repoAnalysis} />}
              <CommitCards commits={commits} />
            </>
        ) : (
          <div className="text-center py-12 px-4">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No repository selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a repository from the dropdown above to view its commit history.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}