import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import Commit from "../types/commit";
import { ChatOllama } from "@langchain/ollama";

const deployment = "local";

let chunkSummaryPrompt = `
  Analyze the high-level evolution of this repository segment based on commit evidence.

  Format output using Markdown:
  - **Bold** for major project direction changes
  - *Italics* for emerging priorities
  - ### Headings for distinct phases
  - Bullet points for related observations

  Required Analysis Sections:

  ### Project Focus
  Document with commit evidence:
  - Primary development priorities
  - Shifts in project scope or direction
  - Feature priority changes
  - User-facing vs. technical improvements

  ### Development Priorities
  Identify with specific commits:
  - Balance between new features and maintenance
  - Focus areas (e.g., performance, user experience, stability)
  - Resource allocation patterns
  - Technical investment decisions

  ### Project Evolution
  Track with commit references:
  - Changes in project goals
  - Shifts in development philosophy
  - Response to challenges or requirements
  - Strategic technical decisions

  Base all observations on commit evidence. Each insight must reference specific commits that demonstrate the pattern or change in direction.

  ### Commit History:
  {input}

  ### Strategic Analysis:
  Provide a fact-based analysis of how this project segment evolved at a strategic level, supported by specific commit evidence.
`;

let chunkChunksPrompt = `
Synthesize multiple development periods to analyze project-level evolution.

Format Requirements:
- ### For distinct project phases
- **Bold** for strategic shifts
- *Italics* for emerging priorities
- Commit references for evidence

Analyze these aspects:

### Strategic Direction
Document with evidence:
- Evolution of project goals
- Changes in development priorities
- Shifts in target audience or use cases
- Major strategic decisions

### Project Priorities
Track with commit references:
- Resource allocation patterns
- Quality vs. speed trade-offs
- Technical investment decisions
- User-facing vs. infrastructure focus

### Development Philosophy
Identify with specific commits:
- Changes in approach to problems
- Evolution of project standards
- Shifts in quality requirements
- Response to user/stakeholder needs

Connect observations to show how project priorities and focus evolved over time.

### Input:
{input}

### Strategic Analysis:
Present a fact-based analysis of how project goals and priorities evolved across these periods, supported by commit evidence.
`;

let finalSummaryPrompt = `
Provide a comprehensive analysis of this repository's strategic evolution based on commit history.

Format Requirements:
- ### For major project phases
- **Bold** for strategic changes
- *Italics* for priority shifts
- Commit citations for evidence

Required Analysis Sections:

### Project Evolution Overview
Document with commit evidence:
- Initial project direction
- Major strategic shifts
- Changes in project scope
- Evolution of priorities

### Strategic Focus
Track with specific commits:
- Changes in project goals
- Shifts in target audience
- Evolution of quality standards
- Resource allocation patterns

### Development Priorities
Identify with concrete examples:
- Balance of feature vs. maintenance work
- Technical investment decisions
- Response to user/stakeholder needs
- Quality and stability focus

### Project Direction
Document with evidence:
- Long-term strategy changes
- Shifts in development philosophy
- Changes in project scope
- Evolution of success metrics

ANALYSIS REQUIREMENTS:
- Cite specific commits for each strategic observation
- Document clear shifts in project direction
- Identify changes in priorities
- Track evolution of project goals
- Note specific responses to challenges
- Maintain factual, evidence-based analysis

### Input:
{input}

### Strategic Evolution Analysis:
Present a fact-based analysis of this project's high-level evolution, supported by specific commit references.
`;

export async function analyzeRepoData(commits: Commit[]): Promise<string> {
  const model = deployment === "local" ? 
    new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: "gemma3:1b",
    }) :
    new ChatOpenAI({
      temperature: 0.7,
      modelName: "gpt-3.5-turbo",
    });

  async function getSummary(commits: Commit[], prompt: string) {
    const formattedCommits = commits.map(commit => 
      `Commit by ${commit.author} on ${commit.timestamp}:\n${commit.commitMessage}\n`
    ).join('\n');

    const promptTemplate = PromptTemplate.fromTemplate(prompt);
    const formattedPrompt = await promptTemplate.format({ input: formattedCommits });
    console.log("Sending prompt to model:", formattedPrompt);
    
    const response = await model.invoke(formattedPrompt);
    return response.content.toString();
  }

  if (commits.length < 10) {
    // Direct summary for small repositories (0-200 words)
    console.log("Final summary prompt:", finalSummaryPrompt + "\nProvide a concise summary in 0-200 words. Do not ask questions or seek elaboration.");
    return await getSummary(commits, finalSummaryPrompt + "\nProvide a concise summary in 0-200 words. Do not ask questions or seek elaboration.");

  } else if (commits.length < 50) {
    // Split into two chunks, then combine (200-400 words)
    const midpoint = Math.floor(commits.length / 2);
    const firstHalf = commits.slice(0, midpoint);
    const secondHalf = commits.slice(midpoint);

    // Get summaries for each half
    const [summary1, summary2] = await Promise.all([
      getSummary(firstHalf, chunkSummaryPrompt),
      getSummary(secondHalf, chunkSummaryPrompt)
    ]);

    const response = await model.invoke(await PromptTemplate.fromTemplate(finalSummaryPrompt + "\nProvide a comprehensive summary in 200-400 words. Do not ask questions or seek elaboration.").format({
      input: `First Half: ${summary1}\nSecond Half: ${summary2}`
    }));
    console.log("Final response mid-sized:", response.content.toString());
    return response.content.toString();
  } else if (commits.length < 100) {
    // Split into four chunks, then combine in tree structure (400-600 words)
    const chunkSize = Math.floor(commits.length / 4);
    const chunks = [
      commits.slice(0, chunkSize),
      commits.slice(chunkSize, chunkSize * 2),
      commits.slice(chunkSize * 2, chunkSize * 3),
      commits.slice(chunkSize * 3)
    ];

    // Get summaries for each chunk
    const chunkSummaries = await Promise.all(
      chunks.map(chunk => getSummary(chunk, chunkSummaryPrompt))
    );

    // Combine pairs of summaries
    const [combinedSummary1, combinedSummary2] = await Promise.all([
      model.invoke(await PromptTemplate.fromTemplate(chunkChunksPrompt).format({
        input: `Summary A: ${chunkSummaries[0]}\nSummary B: ${chunkSummaries[1]}`
      })),
      model.invoke(await PromptTemplate.fromTemplate(chunkChunksPrompt).format({
        input: `Summary A: ${chunkSummaries[2]}\nSummary B: ${chunkSummaries[3]}`
      }))
    ]);

    const finalResponse = await model.invoke(await PromptTemplate.fromTemplate(finalSummaryPrompt + "\nProvide a detailed analysis in 400-600 words. Do not ask questions or seek elaboration.").format({
      input: `First Half: ${combinedSummary1.content}\nSecond Half: ${combinedSummary2.content}`
    }));
    console.log("Final response large:", finalResponse.content.toString());
    return finalResponse.content.toString();

  } else {
    return "Repository is too large for analysis. Please choose a smaller repository.";
  }
}

