using System.Text.Json;
using System.Text;
using QTip.Models;

namespace QTip.Services;

public class AzureOpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _deployment;

    public AzureOpenAIService(string endpoint, string apiKey, string deployment = "gpt-35-turbo")
    {
        _httpClient = new HttpClient();
        _endpoint = endpoint.TrimEnd('/');
        _apiKey = apiKey;
        _deployment = deployment;
    }

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
                        content = @"You are a medical data classifier. Analyze the given text and identify any specific mentions of health conditions, diseases, symptoms, or medical information that could be considered personally identifiable health information (PHI).

Return a JSON response with this structure:
{
  ""detections"": [
    {
      ""term"": ""string - the exact health/medical term found in the text""
    }
  ]
}

Only include the actual health/medical terms found. Return an empty array if no health data is found."
                    },
                    new
                    {
                        role = "user",
                        content = $"Find health/medical information in this text: \"{text}\""
                    }
                },
                    model = _deployment,
                temperature = 0.1,
                max_tokens = 200,
                response_format = new { type = "json_object" }
            };

            Console.WriteLine($"[AI DEBUG] Sending request to Azure OpenAI for text: \"{text}\"");
            Console.WriteLine($"[AI DEBUG] Request body: {JsonSerializer.Serialize(requestBody, new JsonSerializerOptions { WriteIndented = true })}");

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);

            var response = await _httpClient.PostAsync($"{_endpoint}/openai/deployments/{_deployment}/chat/completions?api-version=2024-02-15-preview", content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[AI DEBUG] Received response from Azure OpenAI: {responseContent}");

                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    var result = JsonSerializer.Deserialize<HealthAnalysisResult>(responseContent, options);
                    Console.WriteLine($"[AI DEBUG] Deserialized result: {result != null}");
                    Console.WriteLine($"[AI DEBUG] Choices is null: {result?.Choices == null}");
                    if (result?.Choices != null)
                    {
                        Console.WriteLine($"[AI DEBUG] Deserialized result, choices count: {result.Choices.Length}");
                    }
                    else
                    {
                        Console.WriteLine($"[AI DEBUG] Choices array is null");
                    }

                    if (result?.Choices?.Length > 0)
                    {
                        var rawContent = result.Choices[0].Message?.Content;
                        Console.WriteLine($"[AI DEBUG] Raw AI response content: '{rawContent}'");

                        if (string.IsNullOrWhiteSpace(rawContent))
                        {
                            Console.WriteLine("[AI DEBUG] AI returned empty or null content");
                        }
                        else
                        {
                            HealthDetectionAnalysis? analysis = null;
                            try
                            {
                                var jsonOptions = new JsonSerializerOptions
                                {
                                    PropertyNameCaseInsensitive = true
                                };
                                analysis = JsonSerializer.Deserialize<HealthDetectionAnalysis>(rawContent, jsonOptions);
                                Console.WriteLine($"[AI DEBUG] Analysis object is null: {analysis == null}");
                                if (analysis != null)
                                {
                                    Console.WriteLine($"[AI DEBUG] Analysis.Detections is null: {analysis.Detections == null}");
                                    if (analysis.Detections != null)
                                    {
                                        Console.WriteLine($"[AI DEBUG] Deserialized analysis, detections count: {analysis.Detections.Length}");
                                    }
                                    else
                                    {
                                        Console.WriteLine($"[AI DEBUG] Analysis.Detections is null, trying manual parsing...");
                                        // Try manual parsing to debug
                                        using var doc = JsonDocument.Parse(rawContent);
                                        var detectionsElement = doc.RootElement.GetProperty("detections");
                                        Console.WriteLine($"[AI DEBUG] Found detections in JSON: {detectionsElement.GetArrayLength()}");
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[AI DEBUG] JSON deserialization exception: {ex.Message}");
                                Console.WriteLine($"[AI DEBUG] Raw content that failed: {rawContent}");
                            }

                            // Use the working analysis from above
                            Console.WriteLine($"[AI DEBUG] Using the successfully deserialized analysis");

                            if (analysis != null && analysis.Detections != null)
                            {
                                foreach (var detection in analysis.Detections)
                                {
                                    if (!string.IsNullOrWhiteSpace(detection.Term))
                                    {
                                        Console.WriteLine($"[AI DEBUG] Processing detection term: \"{detection.Term}\"");

                                        // Find all occurrences of this term in the text (case-insensitive)
                                        var matches = System.Text.RegularExpressions.Regex.Matches(text, System.Text.RegularExpressions.Regex.Escape(detection.Term), System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                                        Console.WriteLine($"[AI DEBUG] Found {matches.Count} occurrences of term \"{detection.Term}\"");

                                        foreach (System.Text.RegularExpressions.Match match in matches)
                                        {
                                            detections.Add(new PiiDetection
                                            {
                                                Type = PiiTypes.Health,
                                                OriginalValue = match.Value, // Use the actual matched text (preserves original casing)
                                                StartIndex = match.Index,
                                                EndIndex = match.Index + match.Length,
                                                Tooltip = "PHI - Health Data"
                                            });
                                            Console.WriteLine($"[AI DEBUG] Added detection: \"{match.Value}\" at positions {match.Index}-{match.Index + match.Length}");
                                        }
                                    }
                                    else
                                    {
                                        Console.WriteLine($"[AI DEBUG] Detection term is null or empty");
                                    }
                                }
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine("[AI DEBUG] No choices in response");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AI DEBUG] JSON deserialization error: {ex.Message}");
                    Console.WriteLine($"[AI DEBUG] Raw response: {responseContent}");
                }
            }
            else
            {
                // Log the error but don't throw - AI detection is optional
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Azure OpenAI API error: {response.StatusCode} - {errorContent}");
            }
        }
        catch (Exception ex)
        {
            // Log error but continue - AI detection failures shouldn't break the app
            Console.WriteLine($"Health data detection error: {ex.Message}");
        }

        return detections;
    }

    private class HealthAnalysisResult
    {
        public Choice[]? Choices { get; set; }

        public class Choice
        {
            public Message? Message { get; set; }
        }

        public class Message
        {
            public string? Content { get; set; }
        }
    }

    private class HealthDetectionAnalysis
    {
        public HealthDetectionItem[]? Detections { get; set; }
    }

    private class HealthDetectionItem
    {
        public string? Term { get; set; }
    }
}
