using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using QTip.Models;

namespace QTip.Services;

public class AzureOpenAIService(string endpoint, string apiKey, string deployment = "gpt-4.1-mini")
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient = new();
    private readonly string _endpoint = endpoint.TrimEnd('/');

    public async Task<List<PiiDetection>> DetectHealthDataAsync(string text)
    {
        var detections = new List<PiiDetection>();

        // Skip if text is empty or whitespace only
        if (string.IsNullOrWhiteSpace(text))
        {
            return detections;
        }

        try
        {
            var requestBody = new
            {
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content =
                            """
                            You are a medical data classifier. Analyze the given text and identify any specific mentions of health conditions, diseases, symptoms, or medical terms that could be considered personally identifiable health information (PHI).

                            Return a JSON response with this structure:
                            {
                              "detections": [
                                {
                                  "term": "string - the exact health/medical term found in the text"
                                }
                              ]
                            }

                            Only include the actual health/medical terms found. Return an empty array if no health data is found.
                            """
                    },
                    new
                    {
                        role = "user",
                        content = $"Find health/medical terms in this text: \"{text}\""
                    }
                },
                model = deployment,
                temperature = 0.1,
                max_tokens = 200,
                response_format = new { type = "json_object" }
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("api-key", apiKey);

            var response = await _httpClient.PostAsync(
                $"{_endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview",
                content);

            if (response.IsSuccessStatusCode)
            {
                await ProcessApiResponse(response, detections, text);
            }
        }
        catch (Exception)
        {
            // AI detection failures shouldn't break the app
        }

        return detections;
    }

    private static async Task ProcessApiResponse(HttpResponseMessage response, List<PiiDetection> detections,
        string text)
    {
        var responseContent = await response.Content.ReadAsStringAsync();

        try
        {
            var result = JsonSerializer.Deserialize<HealthAnalysisResult>(responseContent, _jsonOptions);

            if (result?.Choices?.Length > 0)
            {
                var rawContent = result.Choices[0].Message?.Content;

                if (!string.IsNullOrWhiteSpace(rawContent))
                {
                    ProcessAiResponse(rawContent, detections, text);
                }
            }
        }
        catch (Exception)
        {
            // JSON deserialization error
        }
    }

    private static void ProcessAiResponse(string rawContent, List<PiiDetection> detections, string text)
    {
        HealthDetectionAnalysis? analysis = null;
        try
        {
            analysis = JsonSerializer.Deserialize<HealthDetectionAnalysis>(rawContent, _jsonOptions);
        }
        catch (Exception)
        {
            // JSON deserialization failed
        }

        if (analysis is { Detections: not null })
        {
            ExtractDetections(analysis.Detections, detections, text);
        }
    }

    private static void ExtractDetections(HealthDetectionItem[] detectionItems, List<PiiDetection> detections,
        string text)
    {
        detections.AddRange(from detection in detectionItems
            where !string.IsNullOrWhiteSpace(detection.Term)
            from Match match in Regex.Matches(text, Regex.Escape(detection.Term!), RegexOptions.IgnoreCase)
            select new PiiDetection
            {
                Type = PiiTypes.Health,
                OriginalValue = match.Value,
                StartIndex = match.Index,
                EndIndex = match.Index + match.Length,
                Tooltip = "PHI - Health Data"
            });
    }

    private class HealthAnalysisResult
    {
        public Choice[]? Choices { get; init; }

        public class Choice
        {
            public Message? Message { get; set; }
        }

        public class Message
        {
            public string? Content { get; set; }
        }
    }

    private class HealthDetectionItem
    {
        public string? Term { get; set; }
    }

    private class HealthDetectionAnalysis
    {
        public HealthDetectionItem[]? Detections { get; init; }
    }
}