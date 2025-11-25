import { useAzureOpenAIStore, useStatsStore } from '../store'

// Mock fetch globally
global.fetch = jest.fn()

describe('Zustand Stores', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockClear()
    // Reset store state before each test
    useAzureOpenAIStore.getState().clearCredentials()
    useStatsStore.setState({ totalPiiEmails: 0, totalPiiHealthData: 0 })
  })

  describe('useAzureOpenAIStore', () => {
    test('initial state is correct', () => {
      const state = useAzureOpenAIStore.getState()
      expect(state.endpoint).toBe('')
      expect(state.apiKey).toBe('')
      expect(state.deployment).toBe('gpt-4.1-mini')
    })

    test('setCredentials updates state correctly', () => {
      const { setCredentials } = useAzureOpenAIStore.getState()

      setCredentials('https://test.openai.azure.com', 'test-key', 'gpt-4')

      const state = useAzureOpenAIStore.getState()
      expect(state.endpoint).toBe('https://test.openai.azure.com')
      expect(state.apiKey).toBe('test-key')
      expect(state.deployment).toBe('gpt-4')
    })

    test('setCredentials uses default deployment when not provided', () => {
      const { setCredentials } = useAzureOpenAIStore.getState()

      setCredentials('https://test.openai.azure.com', 'test-key')

      const state = useAzureOpenAIStore.getState()
      expect(state.deployment).toBe('gpt-4.1-mini')
    })

    test('clearCredentials resets state', () => {
      const { setCredentials, clearCredentials } = useAzureOpenAIStore.getState()

      // Set some credentials
      setCredentials('https://test.openai.azure.com', 'test-key', 'gpt-4')

      // Clear them
      clearCredentials()

      const state = useAzureOpenAIStore.getState()
      expect(state.endpoint).toBe('')
      expect(state.apiKey).toBe('')
      expect(state.deployment).toBe('gpt-4.1-mini')
    })

    test('hasValidCredentials returns true when all fields are filled', () => {
      const { setCredentials, hasValidCredentials } = useAzureOpenAIStore.getState()

      setCredentials('https://test.openai.azure.com', 'test-key', 'gpt-4')

      expect(hasValidCredentials()).toBe(true)
    })

    test('hasValidCredentials returns false when any field is missing', () => {
      const { setCredentials, hasValidCredentials } = useAzureOpenAIStore.getState()

      // Test missing endpoint
      setCredentials('', 'test-key', 'gpt-4')
      expect(hasValidCredentials()).toBe(false)

      // Test missing apiKey
      setCredentials('https://test.openai.azure.com', '', 'gpt-4')
      expect(hasValidCredentials()).toBe(false)

      // Test missing deployment
      useAzureOpenAIStore.setState({
        endpoint: 'https://test.openai.azure.com',
        apiKey: 'test-key',
        deployment: ''
      })
      expect(useAzureOpenAIStore.getState().hasValidCredentials()).toBe(false)
    })
  })

  describe('useStatsStore', () => {
    test('initial state is correct', () => {
      const state = useStatsStore.getState()
      expect(state.totalPiiEmails).toBe(0)
      expect(state.totalPiiHealthData).toBe(0)
    })

    test('fetchStats updates state with API response', async () => {
      const mockResponse = {
          totalPiiEmails: 42,
          totalPiiHealthData: 15,
        }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { fetchStats } = useStatsStore.getState()
      await fetchStats()

      const state = useStatsStore.getState()
      expect(state.totalPiiEmails).toBe(42)
      expect(state.totalPiiHealthData).toBe(15)
    })

    test('fetchStats handles API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { fetchStats } = useStatsStore.getState()

      // Should not throw
      await expect(fetchStats()).resolves.toBeUndefined()

      // State should remain unchanged
      const state = useStatsStore.getState()
      expect(state.totalPiiEmails).toBe(0)
      expect(state.totalPiiHealthData).toBe(0)
    })

    test('fetchStats calls the correct API endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalPiiEmails: 0, totalPiiHealthData: 0 }),
      })

      const { fetchStats } = useStatsStore.getState()
      await fetchStats()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/stats')
    })

    test('fetchStats uses NEXT_PUBLIC_API_URL when available', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.com'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalPiiEmails: 0, totalPiiHealthData: 0 }),
      })

      const { fetchStats } = useStatsStore.getState()
      await fetchStats()

      expect(global.fetch).toHaveBeenCalledWith('https://custom-api.com/api/stats')

      // Restore original env
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    })
  })
})
