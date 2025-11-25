'use client';

import { useState } from 'react';
import { useAzureOpenAIStore } from '@/lib/store';

export default function AzureCredentials() {
  const { endpoint, apiKey, deployment, setCredentials, clearCredentials, hasValidCredentials } = useAzureOpenAIStore();
  const [showCredentials, setShowCredentials] = useState(false);
  const [localEndpoint, setLocalEndpoint] = useState(endpoint);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localDeployment, setLocalDeployment] = useState(deployment);

  const handleSave = () => {
    if (localEndpoint.trim() && localApiKey.trim() && localDeployment.trim()) {
      // Clean the endpoint URL by removing any trailing paths like "openai/v1/"
      let cleanedEndpoint = localEndpoint.trim();
      cleanedEndpoint = cleanedEndpoint.replace(/\/openai\/v\d+\/?$/, ''); // Remove /openai/v1/ or similar
      cleanedEndpoint = cleanedEndpoint.replace(/\/$/, ''); // Remove trailing slash if present

      setCredentials(cleanedEndpoint, localApiKey.trim(), localDeployment.trim());
      setShowCredentials(false);
    }
  };

  const handleCancel = () => {
    setLocalEndpoint(endpoint); // Reset to current values
    setLocalApiKey(apiKey);
    setLocalDeployment(deployment);
    setShowCredentials(false);
  };

  const handleClear = () => {
    clearCredentials();
    setLocalEndpoint('');
    setLocalApiKey('');
    setShowCredentials(false);
  };

  if (hasValidCredentials() && !showCredentials) {
    return (
      <div className="mb-6 px-8 py-4 bg-gray-50 rounded-full max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Azure OpenAI Configuration</h3>
            <p className="text-sm text-gray-600">✅ Health PII detection enabled</p>
          </div>
          <button
            onClick={() => setShowCredentials(true)}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-colors cursor-pointer"
            style={{ backgroundColor: '#4f7ac7' }}
          >
            Edit Credentials
          </button>
        </div>
      </div>
    );
  }

  if (showCredentials) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Azure OpenAI Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Optional: Add Azure OpenAI credentials to detect health/medical data
        </p>

        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-sm text-blue-800">
            Feel free to use my credentials if you would like, I have included these in the email to Josie.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="your-api-key-here"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your Azure OpenAI API key (keep this secure)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Azure OpenAI Endpoint
            </label>
            <input
              type="url"
              value={localEndpoint}
              onChange={(e) => setLocalEndpoint(e.target.value)}
              placeholder="https://your-resource.openai.azure.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-bold text-yellow-500">⚠</span> This must be in the format
              &#34;https://your-resource-name.openai.azure.com/&#34; and NOT include anything
              additional such as &#34;openai/v1/&#34;
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Deployment Name
            </label>
            <input
              type="text"
              value={localDeployment}
              onChange={(e) => setLocalDeployment(e.target.value)}
              placeholder="gpt-4.1-mini"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              The deployment name from your Azure OpenAI resource (e.g., gpt-4.1-mini, gpt-35-turbo)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!localEndpoint.trim() || !localApiKey.trim() || !localDeployment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save Credentials
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            {hasValidCredentials() && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-center items-center gap-4">
      <span className="text-3xl">🤖</span>
      <button
        onClick={() => setShowCredentials(true)}
        className="px-6 py-3 text-white rounded-full hover:opacity-90 transition-colors font-medium min-h-[40px] cursor-pointer"
        style={{ backgroundColor: '#4f7ac7' }}
      >
        Enable AI Health PII Detection
      </button>
    </div>
  );
}
