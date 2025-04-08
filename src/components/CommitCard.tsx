import Commit from "@/types/commit"


export default function CommitCard(commit: Commit) {
    function formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return  (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {commit.commitMessage.split('\n')[0]}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Committed by <span className="font-medium">{commit.author}</span> on {formatDate(commit.timestamp)}
            </p>
          </div>
        </div>
        
        {commit.commitMessage.split('\n').length > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 sm:px-6 bg-gray-50">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {commit.commitMessage.split('\n').slice(1).join('\n')}
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-200">
          <details className="group">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                View diff
              </div>
            </summary>
            <div className="px-4 py-3 bg-gray-50 text-xs overflow-x-auto">
              <pre className="whitespace-pre font-mono text-gray-800">{commit.diff}</pre>
            </div>
          </details>
        </div>
      </div>
    )
}