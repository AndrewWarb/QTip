import TextInput from '@/components/TextInput';
import StatsPanel from '@/components/StatsPanel';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">QTip - PII Spellchecker</h1>
          <p className="text-lg text-gray-600">
            Real-time personally identifiable information detection and tokenization
          </p>
        </div>

        <TextInput />

        <div className="max-w-md mx-auto">
          <StatsPanel />
        </div>
      </div>
    </main>
  );
}
