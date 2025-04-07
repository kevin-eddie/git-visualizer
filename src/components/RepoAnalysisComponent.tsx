"use client";

import { useState } from "react";
import { RepoAnalysis } from "@/types/RepoAnalysis";

export default function RepoAnalysisComponent({ repoAnalysis }: { repoAnalysis: RepoAnalysis }) {
    return (
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Repository Complexity Analysis</h2>
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        repoAnalysis?.complexity < 30 ? 'bg-green-600' : 
                        repoAnalysis?.complexity < 70 ? 'bg-yellow-600' : 
                        'bg-red-600'
                      }`}
                      style={{ width: `${repoAnalysis?.complexity}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{repoAnalysis?.complexity}/100</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Commits</dt>
                    <dd className="mt-1 text-sm text-gray-900">{repoAnalysis?.metrics.totalCommits}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contributors</dt>
                    <dd className="mt-1 text-sm text-gray-900">{repoAnalysis?.metrics.uniqueContributors.size}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Files Modified</dt>
                    <dd className="mt-1 text-sm text-gray-900">{repoAnalysis?.metrics.filesModified.size}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <div className="whitespace-pre-wrap text-gray-900 text-sm">
                {repoAnalysis?.content}
              </div>
            </div>
          </div>
        </div>
    );
}
