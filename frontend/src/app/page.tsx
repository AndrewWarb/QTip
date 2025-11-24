import TextInput from '@/components/TextInput';
import StatsPanel from '@/components/StatsPanel';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight text-black">
            QTip
          </h1>
        </div>

        <TextInput />

        <div className="max-w-md mx-auto">
          <StatsPanel />
        </div>
      </div>
    </main>
  );
}
