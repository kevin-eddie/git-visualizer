"use client";

import Commit from "@/types/commit";
import CommitCard from "./CommitCard";

export default function CommitCards({ commits }: { commits: Commit[] }) {
    return (
        <div className="space-y-6 px-4 py-6 sm:px-0">
            {commits.map((commit, index) => (
                <CommitCard {...commit} key={index}/>
            ))}
        </div>
    );
}