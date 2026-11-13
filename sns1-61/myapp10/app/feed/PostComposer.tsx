'use client'
import { useState } from 'react'

export function PostComposer() {
  const [text, setText] = useState('')
  
  const handlePost = async () => {
    await fetch('/api/gts/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: text })
    })
    location.reload()
  }

  return (
    <div className="border p-4 rounded-xl flex gap-2">
      <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border p-2 rounded" placeholder="무슨 일이 일어나고 있나요?" />
      <button onClick={handlePost} className="bg-black text-white px-4 rounded">게시</button>
    </div>
  )
}
