'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useStatsStore, useAzureOpenAIStore } from '@/lib/store';

interface PiiDetection {
  type: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
  tooltip: string;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

interface PiiDetectionRequest {
  text: string;
  azureOpenAI?: {
    endpoint: string;
    apiKey: string;
    deployment: string;
  };
}

// Color constants
const EMAIL_UNDERLINE_COLOR = '#2f528c';
const HEALTH_UNDERLINE_COLOR = '#22c55e';
const SUBMIT_BUTTON_COLOR = '#2f528c';

export default function TextInput() {
  // Constants
  const MAX_CHARACTERS = 500;

  // Zustand store
  const { fetchStats } = useStatsStore();

  // Component state
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detections, setDetections] = useState<PiiDetection[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Refs for DOM manipulation
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const detectPii = useCallback(async (inputText: string) => {
    if (!inputText.trim()) {
      setDetections([]);
      return;
    }

    try {
      const requestBody: PiiDetectionRequest = { text: inputText };

      // Get fresh credentials from store at call time (not from closure)
      const currentEndpoint = useAzureOpenAIStore.getState().endpoint;
      const currentApiKey = useAzureOpenAIStore.getState().apiKey;
      const currentDeployment = useAzureOpenAIStore.getState().deployment;
      const hasValidAzureCredentials = useAzureOpenAIStore.getState().hasValidCredentials();

      // Include Azure OpenAI credentials if available
      if (hasValidAzureCredentials) {
        requestBody.azureOpenAI = {
          endpoint: currentEndpoint,
          apiKey: currentApiKey,
          deployment: currentDeployment
        };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/detect-pii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        // Sort detections by startIndex to ensure proper processing order
        const sortedDetections = data.sort((a: PiiDetection, b: PiiDetection) => a.startIndex - b.startIndex);
        setDetections(sortedDetections);
      } else {
        setDetections([]);
      }
    } catch (error) {
      console.error('Failed to detect PII:', error);
      setDetections([]);
    }
  }, []);

  // Debounced text change handler - only calls detectPII after 300ms of no typing
  const handleTextChange = (newText: string) => {
    setText(newText);
    // Clear previous detections immediately when text changes
    setDetections([]);
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // Set new timeout for debounced API call
    debounceTimeoutRef.current = setTimeout(() => {
      void detectPii(newText);
    }, 300);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Prepare submission request with optional Azure credentials
      const requestBody: PiiDetectionRequest = { text };

      // Get fresh credentials from store at submit time
      const currentEndpoint = useAzureOpenAIStore.getState().endpoint;
      const currentApiKey = useAzureOpenAIStore.getState().apiKey;
      const currentDeployment = useAzureOpenAIStore.getState().deployment;
      const hasValidAzureCredentials = useAzureOpenAIStore.getState().hasValidCredentials();

      // Include Azure OpenAI credentials if available
      if (hasValidAzureCredentials) {
        requestBody.azureOpenAI = {
          endpoint: currentEndpoint,
          apiKey: currentApiKey,
          deployment: currentDeployment
        };
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      await fetchStats();
      setText('');
      setDetections([]);
    } catch (error) {
      console.error('Failed to submit text:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHighlightedText = () => {
    if (!text) return text;
    if (detections.length === 0) return text;

    // Create a set of indices that are part of detections for O(1) lookup
    const highlightedIndices = new Set<number>();
    detections.forEach(detection => {
      for (let i = detection.startIndex; i < detection.endIndex; i++) {
        highlightedIndices.add(i);
      }
    });

    const elements: React.ReactNode[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isHighlighted = highlightedIndices.has(i);

      if (isHighlighted) {
        // Find which detection this character belongs to
        const detection = detections.find(d =>
          i >= d.startIndex && i < d.endIndex
        );

        if (detection) {
          const underlineColor = detection.type === 'pii.health' ? HEALTH_UNDERLINE_COLOR : EMAIL_UNDERLINE_COLOR;
          elements.push(
            <span
              key={i}
              className="pii-highlight"
              data-tooltip={detection.tooltip}
              style={{
                textDecoration: 'underline',
                textDecorationStyle: 'wavy',
                textDecorationColor: underlineColor,
                textDecorationThickness: '2px',
                position: 'relative'
              }}
            >
              {char}
            </span>
          );
        }
      } else {
        // Regular character - use React.Fragment for performance
        elements.push(<React.Fragment key={i}>{char}</React.Fragment>);
      }
    }

    return elements;
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
      <div className="mb-4 relative w-full max-w-2xl text-input-wrapper">
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
          >
            {detections.length > 0 && text && (
              <div className="text-input-overlay">
                {renderHighlightedText()}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter text to check for PII..."
            className="w-full p-4 border border-transparent rounded-2xl resize-none min-h-[220px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10 bg-transparent text-input-textarea"
            maxLength={MAX_CHARACTERS}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
          />

          {tooltip && (
            <div
              className={`absolute z-30 px-3 py-1 text-xs text-white bg-gray-900/90 rounded-full pointer-events-none shadow-md transition-opacity duration-100 whitespace-nowrap ${
                tooltip.visible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                top: tooltip.y,
                left: Math.min(Math.max(tooltip.x, 50), wrapperRef.current?.clientWidth ? wrapperRef.current.clientWidth - 50 : tooltip.x),
                transform: 'translate(-50%, -100%)',
                maxWidth: '200px',
              }}
            >
              {tooltip.text}
            </div>
          )}

          {/* Character counter - shows current/total characters */}
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
          backgroundColor: SUBMIT_BUTTON_COLOR,
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
