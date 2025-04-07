import { ChatOpenAI } from "@langchain/openai";  // Updated import path
import { PromptTemplate } from "@langchain/core/prompts";
import { Commit } from "../types/commit";
import { ChatOllama } from "@langchain/ollama";  // Updated import


/*
Notes:

Generating output tokens are three times more expensive than inserting input tokens.
GPT-3.5 Turbo: $0.0005/1K input tokens, $0.0015/1K output tokens

*/

interface ComplexityMetrics {
  totalCommits: number;
  uniqueContributors: Set<string>;
  filesModified: Set<string>;
  languagesUsed: Set<string>;
  maxDirectoryDepth: number;
  hasTests: boolean;
}

function calculateComplexity(commits: Commit[]): ComplexityMetrics & { score: number } {
  const metrics: ComplexityMetrics = {
    totalCommits: commits.length,
    uniqueContributors: new Set(commits.map(c => c.author)),
    filesModified: new Set(),
    languagesUsed: new Set(),
    maxDirectoryDepth: 0,
    hasTests: false,
  };

  // Analyze diffs to gather metrics
  commits.forEach(commit => {
    const diffLines = commit.diff.split('\n');
    diffLines.forEach(line => {
      if (line.startsWith('diff --git')) {
        const filePath = line.split(' ')[2].substring(2); // Remove 'a/'
        metrics.filesModified.add(filePath);
        
        // Calculate directory depth
        const depth = filePath.split('/').length - 1;
        metrics.maxDirectoryDepth = Math.max(metrics.maxDirectoryDepth, depth);
        
        // Detect languages and tests
        if (filePath.includes('test') || filePath.includes('spec')) {
          metrics.hasTests = true;
        }
        const extension = filePath.split('.').pop()?.toLowerCase();
        if (extension) metrics.languagesUsed.add(extension);
      }
    });
  });

  // Calculate complexity score (0-100)
  const score = Math.min(100, 
    (metrics.totalCommits / 10) + // 10 commits = 1 point
    (metrics.uniqueContributors.size * 5) + // each contributor = 5 points
    (metrics.filesModified.size / 5) + // 5 files = 1 point
    (metrics.languagesUsed.size * 3) + // each language = 3 points
    (metrics.maxDirectoryDepth * 2) + // each directory level = 2 points
    (metrics.hasTests ? 10 : 0) // tests present = 10 points
  );

  return { ...metrics, score };
}

export async function analyzeRepoData(commits: Commit[]) {
  const complexity = calculateComplexity(commits);
  
  // const model = new ChatOpenAI({
  //   temperature: 0.7,
  //   modelName: "gpt-3.5-turbo",
  // });

  // To run locally, use the following:
  // Download ollama from https://ollama.com/download
  // Run `ollama pull gemma3:1b` to download the model
  const model = new ChatOllama({
    baseUrl: "http://localhost:11434", // Ollama default URL
    model: "gemma3:1b",
  });

  // Adjust prompt based on complexity
  const basePrompt = `
    You are a senior software engineer analyzing a codebase. 
    The repository has a complexity score of ${complexity.score}/100, with:
    - ${complexity.totalCommits} total commits
    - ${complexity.uniqueContributors.size} contributors
    - ${complexity.filesModified.size} files modified
    - ${complexity.languagesUsed.size} different languages
    - Maximum directory depth of ${complexity.maxDirectoryDepth}
    - ${complexity.hasTests ? 'Contains tests' : 'No tests detected'}

    Based on this complexity level, provide a${complexity.score < 30 ? ' brief' : complexity.score > 70 ? 'n extensive' : ' moderate'} analysis 
    (${complexity.score < 30 ? '0-100' : complexity.score > 70 ? '400-800' : '100-400'} words) of how this codebase evolved.

    Focus on:
    1. Key development phases
    2. Major architectural decisions
    3. Project maturity indicators
    4. Technical debt and complexity management
    ${complexity.score > 70 ? '5. Team dynamics and collaboration patterns\n6. Testing and quality assurance practices' : ''}

    ### Commit History:
    {commits}

    ### Analysis:
  `;

  const prompt = PromptTemplate.fromTemplate(basePrompt);

  const formattedCommits = commits.map(commit => 
    `Commit by ${commit.author} on ${commit.timestamp}:\n${commit.commitMessage}\n`
  ).join('\n');

  const formattedPrompt = await prompt.format({ commits: formattedCommits });
  console.log("Sending prompt to model:", formattedPrompt);

  const response = await model.invoke(formattedPrompt);
  return {
    content: response.content,
    complexity: complexity.score,
    metrics: complexity
  };
}

