// app/feed/PostCard.tsx
'use client'
import { deleteStatus } from '@/lib/gotosocial'

export function PostCard({ post, token }: { post: any, token: string }) {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-2">
      <div className="flex items-center space-x-2">
        <img src={post.account.avatar} className="w-8 h-8 rounded-full" />
        <span className="font-bold text-sm">@{post.account.acct}</span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      
      <button 
        onClick={async () => {
          if(!confirm('삭제?')) return
          await fetch(`/api/gts/statuses/${post.id}`, { method: 'DELETE' })
          location.reload()
        }}
        className="text-red-500 text-sm"
      >
        삭제/Delete
      </button>
    </div>
  )
}
