export interface RepoAnalysis {
    content: string;
    complexity: number;
    metrics: ComplexityMetrics;
}

export interface ComplexityMetrics {
    totalCommits: number;
    uniqueContributors: Set<string>;
    filesModified: Set<string>;
    languagesUsed: Set<string>;
    maxDirectoryDepth: number;
    hasTests: boolean;
}