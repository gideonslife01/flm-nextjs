'use server'

import { auth } from '../auth'
import { getDb } from './db'
import { revalidatePath } from 'next/cache'


export async function createPost(prevState: any, formData: FormData) {
  try {
    
    const session = await auth()
    if (!session?.user?.email) return { error: '로그인이 필요합니다/Login is required' }

    const title = (formData.get('title') as string)?.trim()
    const content = (formData.get('content') as string)?.trim()
    if (!title || !content) return { error: '제목, 내용 다 입력해/Please fill in both title and content' }

    const slug = `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const db = getDb()
    db.prepare(
      'INSERT INTO posts (slug, title, content, author_email) VALUES (?, ?, ?, ?)'
    ).run(slug, title, content, session.user.email)
    db.close()
    
    // 캐시 무효화 / Invalidate cache for the guestbook page
    revalidatePath('/guestbookaction') 
    return { success: true }
  } catch (e: any) {
    console.error('createPost error:', e)
    return { error: e.message }
  }
}

export async function deletePost(id: number) {
  const session = await auth()
  if (!session?.user?.email) throw new Error('로그인이 필요합니다/Login is required')

  const db = getDb()
  const post = db.prepare('SELECT author_email FROM posts WHERE id = ?').get(id) as { author_email: string } | undefined

  if (!post) { db.close(); throw new Error('글 없음/Post not found') }
  if (post.author_email && post.author_email !== session.user.email) {
    db.close(); throw new Error('내 글만 삭제 가능/Only your posts can be deleted')
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
  db.close()

  // 캐시 무효화 / Invalidate cache for the guestbook page
  revalidatePath('/guestbookaction')
}