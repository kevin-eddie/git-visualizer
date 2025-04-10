import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/rest";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { analyzeRepoData } from "@/lib/analyzeRepoData";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo } = await request.json();
  
  try {
    const octokit = new Octokit({
      auth: session.accessToken
    });

    let page = 1;
    let hasMoreCommits = true;
    const commits = [];

    while (hasMoreCommits) {
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

      for (const commit of response.data.slice(0, response.data.length - 1)) {
        const authorName = commit.author?.login || commit.commit.author?.name || 'Unknown';
        const date = new Date(commit.commit.author?.date || '');
        const message = commit.commit.message;
        
        // Get diff for each commit
        const diff = await getDiff(octokit, owner, repo, commit.sha);

        commits.push({
          timestamp: date.toISOString(),
          author: authorName,
          commitMessage: message,
          diff,
          githubUrl: `https://github.com/${owner}/${repo}/commit/${commit.sha}`
        });
      }

      // Handle last commit separately (no diff needed)
      const lastCommit = response.data[response.data.length - 1];
      commits.push({
        timestamp: new Date(lastCommit.commit.author?.date || '').toISOString(),
        author: lastCommit.author?.login || lastCommit.commit.author?.name || 'Unknown',
        commitMessage: lastCommit.commit.message,
        diff: "",
        githubUrl: `https://github.com/${owner}/${repo}/commit/${lastCommit.sha}`
      });
    }

    const commitsWithDates = commits.map(commit => ({
      ...commit,
      timestamp: new Date(commit.timestamp)
    }));
    
    const analysis = await analyzeRepoData(commitsWithDates);
    return NextResponse.json({ commits, analysis });

  } catch (error) {
    console.error('Error analyzing repository:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function getDiff(octokit: Octokit, owner: string, repo: string, commitSha: string): Promise<string> {
  try {
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    if (!commit.parents || commit.parents.length === 0) {
      return "";
    }

    const baseSha = commit.parents[0].sha;
    const { data: comparison } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${baseSha}...${commitSha}`,
    });

    let diffOutput = `Comparing ${baseSha}...${commitSha}\n\n`;
    for (const file of comparison.files ?? []) {
      diffOutput += `diff --git a/${file.filename} b/${file.filename}\n`;
      diffOutput += `--- a/${file.filename}\n`;
      diffOutput += `+++ b/${file.filename}\n`;
      diffOutput += file.patch ?? "(no patch available)\n";
      diffOutput += `\n`;
    }

    return diffOutput;
  } catch (error) {
    console.error('Error fetching commit diff:', error);
    return "";
  }
} 