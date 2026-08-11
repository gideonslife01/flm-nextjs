// app/feed/PostCard.tsx
'use client'

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
          if(!confirm('삭제/Delete?')) return
          await fetch(`/api/gts/statuses/${post.id}`, { method: 'DELETE' })
          location.reload()
        }}
        className="text-red-500 text-sm"
      >
        삭제/Delete
      </button>&nbsp;
        <button 
          onClick={async () => {
            const newText = prompt('수정할 내용 / Edit content:', post.content.replace(/<[^>]*>/g, '')) // HTML 태그 제거 / Remove HTML tags
            if(!newText) return
            await fetch(`/api/gts/statuses/${post.id}`, { 
              method: 'PUT', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newText }) 
            })
            location.reload()
          }}
          className="text-blue-500 text-sm"
        >
          수정/Edit
        </button>
    </div>
  )
}
