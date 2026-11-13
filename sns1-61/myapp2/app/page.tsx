import Image from "next/image";

// Next.js의 Link 컴포넌트를 상단에서 가져옵니다.
// Import the Link component from Next.js at the top.
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      gap: '20px' 
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold' }}>
        👉🏻 두 번째 Next.js 앱 / Second Next.js App 🌐
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>
        🤪 두 번째 화면 수정에 성공했습니다! / Successfully modified the second screen!
      </p>

      {/* 2. Link 컴포넌트를 사용하여 이동 버튼을 만듭니다. / 
          Create a navigation button using the Link component. */}
      <div className="pt-4">
        <Link 
          href="/about" 
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-xl shadow-md transition-colors duration-200"
        >
          About page→
        </Link>
      </div>

    </div>
  );
}
