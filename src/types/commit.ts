export default interface Commit {
  timestamp: Date;
  author: string;
  commitMessage: string;
  diff: string;
}