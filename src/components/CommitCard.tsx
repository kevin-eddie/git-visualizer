import Commit from "@/types/commit"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"


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
        <Card>
            <CardHeader>
                <CardTitle>
                    {commit.commitMessage.split('\n')[0]}
                </CardTitle>
                <CardDescription>
                  Committed by <span className="font-medium">{commit.author}</span> on {formatDate(commit.timestamp)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {commit.commitMessage.split('\n').length > 1 && (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {commit.commitMessage.split('\n').slice(1).join('\n')}
                    </div>
                )}
            </CardContent>
            <CardFooter>
              <a href={commit.githubUrl} className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none">View on GitHub</a>
            </CardFooter>
        </Card>
    )
}