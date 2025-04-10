"use client";
import { Octokit } from "@octokit/rest";
import Commit from "../types/commit";
import CommitCards from "../components/CommitCards"
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { RepoAnalysis } from "../types/repoAnalysis";
import RepoAnalysisComponent from "@/components/RepoAnalysisComponent";
import RepoInformation from "@/types/repoInformation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Home() {  
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
  const [pendingRepo, setPendingRepo] = useState<string>("");

  const { data: session } = useSession();

  const handleRepoChange = (value: string) => {
    setPendingRepo(value);
  };

  const handleConfirmRepo = () => {
    if (!pendingRepo) {
      setSelectedRepo(null);
      return;
    }
    
    const [selectedOwner, selectedRepo] = pendingRepo.split('/');
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
    async function fetchAndAnalyzeRepo() {
      if (!session || !selectedRepo) return;

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            owner: selectedRepo.owner,
            repo: selectedRepo.repo,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze repository');
        }

        const data = await response.json();
        // Convert ISO strings back to Date objects
        const commitsWithDates = data.commits.map((commit: { timestamp: string }) => ({
          ...commit,
          timestamp: new Date(commit.timestamp)
        }));
        setCommits(commitsWithDates);
        setRepoAnalysis(data.analysis);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (selectedRepo) {
      setCommits([]);
      setRepoAnalysis(null);
      fetchAndAnalyzeRepo();
    }
  }, [session, selectedRepo]);

  return (
    <div className="min-h-screen bg-gray">
      <header className="bg-white sm:rounded-lg m-4">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Git Visualizer</h1>
          
          <div className="mt-4 mb-2">
            <label htmlFor="repo-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Repository:
            </label>
            <div className="flex gap-2">
              <Select 
                value={pendingRepo} 
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
              <Button 
                onClick={handleConfirmRepo}
                disabled={isLoadingRepos}
              >
                Load Repository
              </Button>
            </div>
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
      
      <main className="max-w-7xl mx-auto py-6 p-4">
        {selectedRepo ? (
            <div className="flex flex-col gap-4 bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold mx-4 my-2">
                Commits for {selectedRepo.owner}/{selectedRepo.repo}
              </div>
              <CommitCards commits={commits}/>
              {repoAnalysis && <RepoAnalysisComponent repoAnalysis={repoAnalysis} />}
            </div>
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