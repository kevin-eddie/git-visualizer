"use client";

import ReactMarkdown from 'react-markdown';

export default function RepoAnalysisComponent({ repoAnalysis }: { repoAnalysis: string }) {
    return (
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Repository Analysis</h2>
            </div>
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <div className="prose prose-sm max-w-none text-gray-900">
                <ReactMarkdown>{repoAnalysis}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
    );
}
