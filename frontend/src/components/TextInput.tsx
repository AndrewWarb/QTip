'use client';

import { useState, useRef, useCallback } from 'react';
import { useStatsStore } from '@/lib/store';

interface PiiDetection {
  type: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
  tooltip: string;
}

export default function TextInput() {
  const [text, setText] = useState('');
  const [detections, setDetections] = useState<PiiDetection[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { fetchStats } = useStatsStore();

  const detectPii = useCallback(async (inputText: string) => {
    console.log('Detecting PII for:', inputText);
    if (!inputText.trim()) {
      console.log('No text, clearing detections');
      setDetections([]);
      return;
    }

    try {
      console.log('Calling API...');
      const response = await fetch('http://localhost:5263/api/detect-pii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      console.log('API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        setDetections(data);
      } else {
        console.log('API call failed');
        setDetections([]);
      }
    } catch (error) {
      console.error('Failed to detect PII:', error);
      setDetections([]);
    }
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    // Debounce the API call to avoid too many requests while typing
    const timeoutId = setTimeout(() => detectPii(newText), 300);
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async () => {
    try {
      await fetch('http://localhost:5263/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      fetchStats();
      setText('');
      setDetections([]);
    } catch (error) {
      console.error('Failed to submit text:', error);
    }
  };

  const renderHighlightedText = () => {
    console.log('renderHighlightedText called with text:', text, 'detections:', detections);
    if (!text || detections.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    detections.forEach((detection, index) => {
      console.log(`Processing detection ${index}:`, detection);
      // Add text before the detection
      result += text.slice(lastIndex, detection.startIndex);
      // Add highlighted detection with wavy underline (per spec)
      result += `<span style="text-decoration: underline; text-decoration-style: wavy; text-decoration-color: blue; text-decoration-thickness: 1px;" title="${detection.tooltip}">${detection.originalValue}</span>`;
      lastIndex = detection.endIndex;
    });

    // Add remaining text
    result += text.slice(lastIndex);
    console.log('Final result:', result);
    return result;
  };

  console.log('TextInput render - text:', `"${text}"`, 'detections:', detections.length);

  return (
    <div className="p-4">
      <div className="mb-4 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter text to check for PII..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none min-h-[200px] max-w-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10"
          style={{
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            fontSize: '16px',
            lineHeight: '24px',
          }}
        />

        {/* Debug: Show detection count and conditions */}
        <div className="absolute top-2 right-2 text-xs z-20 bg-white px-2 py-1 rounded border">
          <div>Detections: {detections.length}</div>
          <div>Has Text: {text ? 'Yes' : 'No'}</div>
          <div>Should Render: {detections.length > 0 && text ? 'Yes' : 'No'}</div>
        </div>

        {/* Highlight overlay - ALWAYS render for debugging */}
        <div
          className="absolute inset-0 p-3 pointer-events-none z-0"
          style={{
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            fontSize: '16px',
            lineHeight: '24px',
            background: detections.length > 0 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)', // Red if detections, green if none
          }}
        >
          <div
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              color: 'transparent',
            }}
            dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="mt-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Submit & Tokenize
      </button>
    </div>
  );
}
