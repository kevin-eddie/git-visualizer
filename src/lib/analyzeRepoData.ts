import { ChatOpenAI } from "@langchain/openai";  // Updated import path
import { PromptTemplate } from "@langchain/core/prompts";
import { Commit } from "../types/commit";

export async function analyzeRepoData(commits: Commit[]) {
  const model = new ChatOpenAI({
    temperature: 0.7,
    modelName: "gpt-3.5-turbo",
  });

  const prompt = PromptTemplate.fromTemplate(`
    You are a senior software engineer writing a detailed narrative about the progression of a codebase over time.

    You have access to multiple summaries of earlier code changes, each derived from large sequences of diffs grouped by time or functionality.

    Using these summaries, write a comprehensive and technically insightful explanation of how the codebase evolved.

    Your output should:
    1. Follow a chronological structure, highlighting major phases or shifts.
    2. Explain what types of changes occurred (feature additions, architectural overhauls, refactoring, etc.).
    3. Describe *why* these changes may have been made -- the developer intent or context where possible.
    4. Comment on the direction of the codebase (e.g. growing complexity, increased modularity, maturity, stability).
    5. Capture both low-level trends (naming, testing, structure) and high-level themes (like design patterns, modularization, infrastructure shifts).
    6. Include technical language, but remain readable and structured.

    Do **not** list changes mechanically. Tell a story about how the codebase grew and changed.

    ### Input Summaries:
    {commits}

    ### Final Evolution Summary:
  `);

  const formattedCommits = commits.map(commit => 
    `Commit by ${commit.author} on ${commit.timestamp}:\n${commit.commitMessage}\n`
  ).join('\n');

  const formattedPrompt = await prompt.format({ commits: formattedCommits });
  console.log("Sending prompt to model:", formattedPrompt);

  const response = await model.invoke(formattedPrompt);

  return response.content;
}