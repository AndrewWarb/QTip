import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import StatsPanel from '../StatsPanel'
import { useStatsStore, useAzureOpenAIStore } from '@/lib/store'

// Mock the stores
jest.mock('@/lib/store', () => ({
  useStatsStore: jest.fn(),
  useAzureOpenAIStore: jest.fn(),
}))

const mockUseStatsStore = useStatsStore as jest.MockedFunction<typeof useStatsStore>
const mockUseAzureOpenAIStore = useAzureOpenAIStore as jest.MockedFunction<typeof useAzureOpenAIStore>

describe('StatsPanel Component', () => {
  const mockFetchStats = jest.fn()

  beforeEach(() => {
    mockFetchStats.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Email Stats Display', () => {
    test('displays email stats correctly', () => {
      mockUseStatsStore.mockReturnValue({
        totalPiiEmails: 42,
        totalPiiHealthData: 0,
        fetchStats: mockFetchStats,
      })

      mockUseAzureOpenAIStore.mockReturnValue({
        endpoint: '',
        apiKey: '',
        deployment: '',
        setCredentials: jest.fn(),
        clearCredentials: jest.fn(),
        hasValidCredentials: jest.fn().mockReturnValue(false),
      })

      render(<StatsPanel />)

      expect(screen.getByText('Total PII emails submitted:')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  describe('Health Stats Display', () => {
    test('shows health stats when Azure credentials are valid', () => {
      mockUseStatsStore.mockReturnValue({
        totalPiiEmails: 10,
        totalPiiHealthData: 25,
        fetchStats: mockFetchStats,
      })

      mockUseAzureOpenAIStore.mockReturnValue({
        endpoint: 'https://test.openai.azure.com',
        apiKey: 'test-key',
        deployment: 'gpt-4',
        setCredentials: jest.fn(),
        clearCredentials: jest.fn(),
        hasValidCredentials: jest.fn().mockReturnValue(true),
      })

      render(<StatsPanel />)

      expect(screen.getByText('Total PII emails submitted:')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Total PII health data items submitted:')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })

    test('hides health stats when Azure credentials are not valid', () => {
      mockUseStatsStore.mockReturnValue({
        totalPiiEmails: 10,
        totalPiiHealthData: 25,
        fetchStats: mockFetchStats,
      })

      mockUseAzureOpenAIStore.mockReturnValue({
        endpoint: '',
        apiKey: '',
        deployment: '',
        setCredentials: jest.fn(),
        clearCredentials: jest.fn(),
        hasValidCredentials: jest.fn().mockReturnValue(false),
      })

      render(<StatsPanel />)

      expect(screen.getByText('Total PII emails submitted:')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.queryByText('Total PII health data items submitted:')).not.toBeInTheDocument()
      expect(screen.queryByText('25')).toBe(null)
    })
  })

  describe('Data Fetching', () => {
    test('calls fetchStats on component mount', () => {
      mockUseStatsStore.mockReturnValue({
        totalPiiEmails: 0,
        totalPiiHealthData: 0,
        fetchStats: mockFetchStats,
      })

      mockUseAzureOpenAIStore.mockReturnValue({
        endpoint: '',
        apiKey: '',
        deployment: '',
        setCredentials: jest.fn(),
        clearCredentials: jest.fn(),
        hasValidCredentials: jest.fn().mockReturnValue(false),
      })

      render(<StatsPanel />)

      expect(mockFetchStats).toHaveBeenCalledTimes(1)
    })
  })

})
