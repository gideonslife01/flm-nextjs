import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// const guestbookData = [
//   { id: 1, name: '2B', content: '니어오토마타 / Nier:Automata' },
//   { id: 2, name: '9S', content: 'Next.js API App Routes.' },
// ];

// GET 요청 처리 (데이터 조회)
// Handle GET requests (data retrieval)
// export async function GET() {
//   return NextResponse.json(guestbookData);
// }

export async function GET() {
  const postsDirectory = path.join(process.cwd(), 'app', 'posts');

  if (!fs.existsSync(postsDirectory)) {
    return NextResponse.json([]);
  }

  try {
    const fileNames = fs.readdirSync(postsDirectory);
    const mdFiles = fileNames.filter(fileName => fileName.endsWith('.md'));

    // 각 파일의 상세 정보(수정 시간 등)를 포함한 객체 배열 만들기
    // Create an array of objects containing detailed information (modification time, etc.) for each file
    const allPostsData = mdFiles.map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      
      // 파일의 상태 정보(생성/수정 시간 등)를 가져옵니다.
      // Retrieves file status information (creation/modification time, etc.).
      const stat = fs.statSync(fullPath);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      return {
        slug,
        content: fileContents,

        // 정렬 기준으로 삼기 위해 파일 수정 시간을 숫자로 변환하여 보관합니다.
        // Convert the file modification time to a number and store it to use as a sorting criterion.
        dateValue: stat.mtime.getTime(), 
      };
    });

    // 최신 수정/생성 시간 기준으로 내림차순(최신순) 정렬하기
    // Sort in descending order (latest first) based on the latest modification/creation time
    allPostsData.sort((a, b) => b.dateValue - a.dateValue);

    // 프론트엔드로 데이터를 넘겨줄 때는 임시 변수인 dateValue를 제외하고 전달 가능합니다.
    // When passing data to the frontend, you can exclude the temporary variable dateValue.
    const sortedPosts = allPostsData.map(({ slug, content }) => ({ slug, content }));

    return NextResponse.json(sortedPosts);

  } catch (error) {
    console.error("파일 읽기 및 정렬 오류 / File reading and sorting error:", error);
    return NextResponse.json({ message: "데이터를 읽어오지 못했습니다./Failed to read data." }, { status: 500 });
  }
}

// POST 요청 처리 (데이터 등록)
// Handle POST requests (data registration)
// export async function POST(request) {
//   const body = await request.json();
//   const { name, content } = body;

//   if (!name || !content) {
//     return NextResponse.json({ message: '이름과 내용을 입력해주세요. / Please enter both name and content.' }, { status: 400 });
//   }

//   const newPost = {
//     id: Date.now(),
//     name,
//     content,
//   };

//   guestbookData.push(newPost);
//   return NextResponse.json(newPost, { status: 201 });
// }
// app/api/posts/route.js (또는 route.ts)

export async function POST(request) {
  try {
    const body = await request.json();
    // 블로그에 맞게 name 대신 title(제목), content(본문)를 받습니다.
    // Instead of name, we receive title and content to fit the blog context.
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { message: '제목과 내용을 모두 입력해주세요. / Please enter both title and content.' }, 
        { status: 400 }
      );
    }

    // slug만들기,공백을 하이픈으로 대체하고 특수문자 제거
    // Create a slug by replacing spaces with hyphens and removing special characters 
    const slug = title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9가-힣\-]/g, '');

    // 저장할 파일 경로 지정 (app/posts/파일명.md)
    // Specify the file path to save (app/posts/filename.md)
    const postsDirectory = path.join(process.cwd(), 'app', 'posts');
    
    const fullPath = path.join(postsDirectory, `${slug}.md`);

    // 안전장치: 혹시 똑같은 제목의 파일이 이미 존재하면 충돌 방지
    // Safety measure: Prevent collision if a file with the same title already exists
    if (fs.existsSync(fullPath)) {
      return NextResponse.json(
        { message: '이미 동일한 제목의 글이 존재합니다. / A post with the same title already exists.' }, 
        { status: 409 }
      );
    }

    // 마크다운 파일에 들어갈 포맷(Front-matter 포함) 구성하기
    // Construct the format (including front-matter) to be included in the markdown file
    const fileContent = `---
title: "${title}"
date: "${new Date().toISOString().split('T')[0]}"
---

${content}`;

    // app/posts 폴더 안에 파일 생성 및 쓰기!
    // Create and write the file inside the app/posts folder!
    fs.writeFileSync(fullPath, fileContent, 'utf8');

    // 성공 시 브라우저(프론트엔드)로 던져줄 결과값
    // he result to be sent to the browser (frontend) upon success
    return NextResponse.json({ slug, content: fileContent }, { status: 201 });

  } catch (error) {
    console.error("마크다운 파일 생성 오류/Markdown file creation error:", error);
    return NextResponse.json(
      { message: '서버에서 파일을 생성하지 못했습니다. / Failed to create markdown file.' }, 
      { status: 500 }
    );
  }
}

