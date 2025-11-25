import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AzureCredentials from '../AzureCredentials'
import { useAzureOpenAIStore } from '@/lib/store'

// Mock the store
jest.mock('@/lib/store', () => ({
  useAzureOpenAIStore: jest.fn(),
}))

const mockUseAzureOpenAIStore = useAzureOpenAIStore as jest.MockedFunction<typeof useAzureOpenAIStore>

describe('AzureCredentials Component', () => {
  const mockSetCredentials = jest.fn()
  const mockClearCredentials = jest.fn()
  const mockHasValidCredentials = jest.fn()

  beforeEach(() => {
    mockUseAzureOpenAIStore.mockReturnValue({
      endpoint: '',
      apiKey: '',
      deployment: 'gpt-4.1-mini',
      setCredentials: mockSetCredentials,
      clearCredentials: mockClearCredentials,
      hasValidCredentials: mockHasValidCredentials,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('URL Cleaning Logic', () => {
    // Test the URL cleaning logic in isolation
    test('cleans endpoint URL by removing openai/v1 path', () => {
      const testCases = [
        { input: 'https://test.openai.azure.com/openai/v1/', expected: 'https://test.openai.azure.com' },
        { input: 'https://test.openai.azure.com/openai/v1', expected: 'https://test.openai.azure.com' },
        { input: 'https://test.openai.azure.com/', expected: 'https://test.openai.azure.com' },
        { input: 'https://test.openai.azure.com', expected: 'https://test.openai.azure.com' },
      ]

      testCases.forEach(({ input, expected }) => {
        let cleanedEndpoint = input.trim()
        cleanedEndpoint = cleanedEndpoint.replace(/\/openai\/v\d+\/?$/, '')
        cleanedEndpoint = cleanedEndpoint.replace(/\/$/, '')

        expect(cleanedEndpoint).toBe(expected)
      })
    })
  })

  describe('Form Validation', () => {
    test('prevents saving when fields are empty', async () => {
      mockHasValidCredentials.mockReturnValue(false)

      render(<AzureCredentials />)

      // Click the enable button
      const enableButton = screen.getByText('Enable AI Health PII Detection')
      fireEvent.click(enableButton)

      // Try to save with empty fields
      const saveButton = screen.getByText('Save Credentials')
      fireEvent.click(saveButton)

      // Should not call setCredentials
      expect(mockSetCredentials).not.toHaveBeenCalled()
    })

    test('saves credentials when all fields are filled', async () => {
      mockHasValidCredentials.mockReturnValue(false)

      render(<AzureCredentials />)

      // Click the enable button
      const enableButton = screen.getByText('Enable AI Health PII Detection')
      fireEvent.click(enableButton)

      // Fill in the form
      const endpointInput = screen.getByLabelText('Azure OpenAI Endpoint')
      const apiKeyInput = screen.getByLabelText('API Key')
      const deploymentInput = screen.getByLabelText('Model Deployment Name')

      await userEvent.clear(endpointInput)
      await userEvent.clear(apiKeyInput)
      await userEvent.clear(deploymentInput)
      await userEvent.type(endpointInput, 'https://test.openai.azure.com/openai/v1/')
      await userEvent.type(apiKeyInput, 'test-api-key')
      await userEvent.type(deploymentInput, 'gpt-4')

      // Save the form
      const saveButton = screen.getByText('Save Credentials')
      fireEvent.click(saveButton)

      // Should call setCredentials with cleaned URL
      await waitFor(() => {
        expect(mockSetCredentials).toHaveBeenCalledWith(
          'https://test.openai.azure.com', // URL cleaned
          'test-api-key',
          'gpt-4'
        )
      })
    })
  })
})
