export type RepoAnalysis = string;

export interface ComplexityMetrics {
    totalCommits: number;
    uniqueContributors: Set<string>;
    filesModified: Set<string>;
    languagesUsed: Set<string>;
    maxDirectoryDepth: number;
    hasTests: boolean;
}