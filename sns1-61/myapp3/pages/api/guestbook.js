// 서버가 켜져 있는 동안 유지되는 임시 데이터 저장소
// Temporary data storage that persists while the server is running
const guestbookData = [
  { id: 1, name: 'Alexios', content: '어쌔씬크리드오디세에 / Assassin\'s Creed Odyssey' },
  { id: 2, name: 'Kassandra', content: 'Next.js API Page Routes.' },
];

export default function handler(req, res) {
  // GET 요청 처리 (데이터 조회)
  // Handle GET requests (data retrieval)
  if (req.method === 'GET') {
    return res.status(200).json(guestbookData);
  }

  // POST 요청 처리 (데이터 등록)
  // Handle POST requests (data registration)
  if (req.method === 'POST') {
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ message: '이름과 내용을 입력해주세요. / Please enter both name and content.' });
    }

    const newPost = {
      id: Date.now(),
      name,
      content,
    };

    guestbookData.push(newPost);
    return res.status(201).json(newPost);
  }

  // 3. 지원하지 않는 메서드 처리
  // Handle unsupported methods
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

