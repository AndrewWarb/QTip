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
  const MAX_CHARACTERS = 500;
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detections, setDetections] = useState<PiiDetection[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const { fetchStats } = useStatsStore();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number; visible: boolean } | null>(null);

  const detectPii = useCallback(async (inputText: string) => {
    if (!inputText.trim()) {
      setDetections([]);
      return;
    }

    try {
      const response = await fetch('http://localhost:5263/api/detect-pii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (response.ok) {
        const data = await response.json();
        setDetections(data);
      } else {
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHighlightedText = () => {
    if (!text || detections.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    detections.forEach((detection) => {
      // Add text before the detection
      result += text.slice(lastIndex, detection.startIndex);
      // Add highlighted detection with wavy underline (per spec)
      result += `<span class="pii-highlight" data-tooltip="${detection.tooltip}" style="text-decoration: underline; text-decoration-style: wavy; text-decoration-color: #2f528c; text-decoration-thickness: 2px; position: relative;">${detection.originalValue}</span>`;
      lastIndex = detection.endIndex;
    });

    // Add remaining text
    result += text.slice(lastIndex);
    return result;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current || !highlightRef.current) {
      setTooltip(null);
      return;
    }

    const highlights = highlightRef.current.querySelectorAll<HTMLElement>('.pii-highlight');
    if (!highlights.length) {
      setTooltip(null);
      return;
    }

    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    const pointerX = event.clientX;
    const pointerY = event.clientY;
    let found = false;

    for (const span of highlights) {
      const rect = span.getBoundingClientRect();
      if (pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom) {
        found = true;
        setTooltip({
          text: span.dataset.tooltip ?? 'PII – Email Address',
          x: rect.left + rect.width / 2 - wrapperRect.left,
          y: rect.top - wrapperRect.top - 6,
          visible: true,
        });
        break;
      }
    }

    if (!found) {
      setTooltip((prev) =>
        prev ? { ...prev, visible: false } : null
      );
    }
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="mb-4 relative w-full max-w-2xl" style={{ lineHeight: 0 }}>
        <div
          ref={wrapperRef}
          className="relative w-full rounded-2xl bg-white shadow-sm"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Highlight overlay sits underneath textarea */}
          <div
            ref={highlightRef}
            className="absolute inset-0 rounded-2xl pointer-events-none z-0"
            style={{
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
              fontSize: '16px',
              lineHeight: '24px',
            }}
          >
            {detections.length > 0 && text && (
              <div
                style={{
                  margin: 0,
                  padding: '16px', // matches textarea padding (p-4)
                  border: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  color: 'transparent',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
              />
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter text to check for PII..."
            className="w-full p-4 border border-transparent rounded-2xl resize-none min-h-[220px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10 bg-transparent"
            maxLength={MAX_CHARACTERS}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            style={{
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
              fontSize: '16px',
              lineHeight: '24px',
            }}
          />

          {tooltip && (
            <div
              className={`absolute z-30 px-3 py-1 text-xs text-white bg-gray-900/90 rounded-full pointer-events-none shadow-md transition-opacity duration-100 ${
                tooltip.visible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                top: tooltip.y,
                left: tooltip.x,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {tooltip.text}
            </div>
          )}

          <div className="absolute bottom-2 right-4 text-xs text-gray-400 z-10">
            {text.length} / {MAX_CHARACTERS}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting}
        className="mt-2 text-white px-6 py-2 rounded-lg font-semibold tracking-wide transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 min-w-[100px] min-h-[40px]"
        style={{
          backgroundColor: '#2f528c',
          opacity: text.trim() && !isSubmitting ? 1 : 0.7,
          cursor: text.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? (
          <>
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </>
        ) : (
          'Submit'
        )}
      </button>
    </div>
  );
}
