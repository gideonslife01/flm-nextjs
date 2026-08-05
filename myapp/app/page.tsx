import Image from "next/image";

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
        👉🏻 첫번째 Next.js 앱 / first Next.js App 🌐
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>
        🤪 첫 화면 수정에 성공했습니다! / Successfully modified the first screen!
      </p>
    </div>
  );
}
