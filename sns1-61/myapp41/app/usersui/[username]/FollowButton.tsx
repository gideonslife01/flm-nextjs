// ✅ myapp41 - FolloButton Component
// app/usersui/[username]/_components/FollowButton.tsx
'use client';
import { useState } from "react";

export function FollowButton({ username, initialFollowing }: { username: string, initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  
  const toggle = async () => {
    const url = `/api/v1/accounts/${username}/${following ? 'unfollow' : 'follow'}`;
    const res = await fetch(url, { method: 'POST', credentials: 'include' });
    if(res.ok) setFollowing(!following);
  };

  return (
    <button onClick={toggle} className={`px-4 py-1.5 rounded-full font-bold ${following ? 'bg-gray-200' : 'bg-black text-white'}`}>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}