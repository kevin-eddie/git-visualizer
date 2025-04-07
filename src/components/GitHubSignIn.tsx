"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function GitHubSignIn() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return <div>Loading...</div>;
  }

  if (session) {
    return (
      <div className="flex flex-row gap-4">
        <span>Signed in as {session.user?.name}</span>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signIn("github")}>
        Sign in with GitHub
      </button>
    </div>
  );
}