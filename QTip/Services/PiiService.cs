using System.Text.RegularExpressions;
using QTip.Data;
using QTip.Models;
using Microsoft.EntityFrameworkCore;

namespace QTip.Services;

public partial class PiiService(AppDbContext context, AzureOpenAIService? aiService = null)
{
    private readonly Regex _emailRegex = EmailRegex();
    private readonly AzureOpenAIService? _aiService = aiService;

    public async Task<(string TokenizedText, List<Classification> Classifications)> ProcessTextAsync(string text,
        AzureOpenAICredentials? azureCredentials = null)
    {
        Console.WriteLine($"[SUBMIT DEBUG] Processing text for submission: \"{text}\"");
        var tokenizedText = text;
        var classifications = new List<Classification>();

        // Email detection/tokenization
        var matches = _emailRegex.Matches(text);
        Console.WriteLine($"[SUBMIT DEBUG] Found {matches.Count} email matches");
        foreach (Match match in matches)
        {
            var email = match.Value;
            var token = $"{{EMAIL_TOKEN_{Guid.NewGuid():N}}}";
            Console.WriteLine($"[SUBMIT DEBUG] Tokenizing email: \"{email}\" -> \"{token}\"");
            tokenizedText = tokenizedText.Replace(email, token, StringComparison.OrdinalIgnoreCase);
            classifications.Add(new Classification(PiiTypes.Email) { Token = token, OriginalValue = email });
        }

        // Health data detection/tokenization using AI
        AzureOpenAIService? aiServiceToUse = _aiService;
        if (azureCredentials != null && !string.IsNullOrEmpty(azureCredentials.Endpoint) &&
            !string.IsNullOrEmpty(azureCredentials.ApiKey))
        {
            var deployment = string.IsNullOrEmpty(azureCredentials.Deployment)
                ? "gpt-4.1-mini"
                : azureCredentials.Deployment;
            aiServiceToUse = new AzureOpenAIService(azureCredentials.Endpoint, azureCredentials.ApiKey, deployment);
            Console.WriteLine(
                $"[SUBMIT DEBUG] Using provided Azure credentials - endpoint: '{azureCredentials.Endpoint}', deployment: '{deployment}'");
        }

        if (aiServiceToUse != null)
        {
            try
            {
                Console.WriteLine("[SUBMIT DEBUG] Calling AI service for health detection");
                var healthDetections = await aiServiceToUse.DetectHealthDataAsync(text);
                Console.WriteLine($"[SUBMIT DEBUG] AI returned {healthDetections.Count} health detections");

                foreach (var detection in healthDetections)
                {
                    Console.WriteLine($"[SUBMIT DEBUG] Processing health detection: \"{detection.OriginalValue}\"");
                    // Only tokenize if we haven't already tokenized this section
                    if (tokenizedText.Contains(detection.OriginalValue))
                    {
                        var token = $"{{HEALTH_TOKEN_{Guid.NewGuid():N}}}";
                        Console.WriteLine(
                            $"[SUBMIT DEBUG] Tokenizing health data: \"{detection.OriginalValue}\" -> \"{token}\"");
                        tokenizedText = tokenizedText.Replace(detection.OriginalValue, token,
                            StringComparison.OrdinalIgnoreCase);
                        classifications.Add(new Classification(PiiTypes.Health)
                            { Token = token, OriginalValue = detection.OriginalValue });
                    }
                    else
                    {
                        Console.WriteLine(
                            $"[SUBMIT DEBUG] Health term \"{detection.OriginalValue}\" not found in current tokenized text");
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but continue - AI detection is optional
                Console.WriteLine($"AI health detection failed during tokenization: {ex.Message}");
            }
        }
        else
        {
            Console.WriteLine("[SUBMIT DEBUG] No AI service available for health detection");
        }

        // Save submission
        var submission = new Submission { TokenizedText = tokenizedText };
        context.Submissions.Add(submission);
        await context.SaveChangesAsync();

        // Link classifications
        foreach (var classification in classifications)
        {
            classification.SubmissionId = submission.Id;
            context.Classifications.Add(classification);
        }

        await context.SaveChangesAsync();

        Console.WriteLine(
            $"[SUBMIT DEBUG] Final result - Tokenized: \"{tokenizedText}\", Classifications: {classifications.Count}");

        return (tokenizedText, classifications);
    }

    public async Task<int> GetTotalPiiEmailsAsync() =>
        await context.Classifications.CountAsync(c => c.Tag == PiiTypes.Email);

    public async Task<int> GetTotalPiiHealthDataAsync() =>
        await context.Classifications.CountAsync(c => c.Tag == PiiTypes.Health);

    public async Task<List<PiiDetection>> DetectPiiAsync(string text, AzureOpenAICredentials? azureCredentials = null)
    {
        Console.WriteLine($"[DETECT DEBUG] DetectPiiAsync called with text: '{text}'");
        Console.WriteLine($"[DETECT DEBUG] Azure credentials provided: {azureCredentials != null}");
        if (azureCredentials != null)
        {
            Console.WriteLine(
                $"[DETECT DEBUG] Endpoint: '{azureCredentials.Endpoint}', API Key length: {azureCredentials.ApiKey?.Length ?? 0}, Deployment: '{azureCredentials.Deployment}'");
            Console.WriteLine(
                $"[DETECT DEBUG] API Key starts with: '{azureCredentials.ApiKey?.Substring(0, Math.Min(10, azureCredentials.ApiKey?.Length ?? 0)) ?? "null"}...'");
        }

        var detections = new List<PiiDetection>();

        // Email detection
        var matches = _emailRegex.Matches(text);
        foreach (Match match in matches)
        {
            detections.Add(new PiiDetection
            {
                Type = PiiTypes.Email,
                OriginalValue = match.Value,
                StartIndex = match.Index,
                EndIndex = match.Index + match.Length,
                Tooltip = "PII - Email Address"
            });
        }

        // Health data detection using AI (if service is available)
        AzureOpenAIService? aiService = _aiService;
        if (azureCredentials != null && !string.IsNullOrEmpty(azureCredentials.Endpoint) &&
            !string.IsNullOrEmpty(azureCredentials.ApiKey))
        {
            Console.WriteLine(
                $"[AI DEBUG] Creating AzureOpenAIService with endpoint: '{azureCredentials.Endpoint}', deployment: '{azureCredentials.Deployment}'");
            // Use dynamically provided credentials
            var deployment = string.IsNullOrEmpty(azureCredentials.Deployment)
                ? "gpt-35-turbo"
                : azureCredentials.Deployment;
            Console.WriteLine($"[AI DEBUG] Final deployment name: '{deployment}'");
            aiService = new AzureOpenAIService(azureCredentials.Endpoint, azureCredentials.ApiKey, deployment);
        }
        else
        {
            Console.WriteLine(
                $"[AI DEBUG] No Azure credentials provided or invalid. Credentials null: {azureCredentials == null}");
            if (azureCredentials != null)
            {
                Console.WriteLine(
                    $"[AI DEBUG] Endpoint empty: {string.IsNullOrEmpty(azureCredentials.Endpoint)}, API key empty: {string.IsNullOrEmpty(azureCredentials.ApiKey)}");
            }
        }

        if (aiService != null)
        {
            try
            {
                var healthDetections = await aiService.DetectHealthDataAsync(text);
                detections.AddRange(healthDetections);
            }
            catch (Exception ex)
            {
                // Log error but don't fail - AI detection is optional
                Console.WriteLine($"AI health detection failed: {ex.Message}");
            }
        }

        return detections;
    }

    [GeneratedRegex(@"(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", RegexOptions.Compiled, "en-US")]
    private static partial Regex EmailRegex();
}