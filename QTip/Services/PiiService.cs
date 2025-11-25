using System.Text.RegularExpressions;
using QTip.Data;
using QTip.Models;
using Microsoft.EntityFrameworkCore;

namespace QTip.Services;

public partial class PiiService(AppDbContext context, AzureOpenAIService? service = null)
{
    private readonly Regex _emailRegex = EmailRegex();

    public async Task<(string TokenizedText, List<Classification> Classifications)> ProcessTextAsync(string text,
        AzureOpenAICredentials? azureCredentials = null)
    {
        var (tokenizedText, classifications) = await ProcessTextCoreAsync(text, azureCredentials);
        await SaveSubmissionAsync(tokenizedText, classifications);

        return (tokenizedText, classifications);
    }

    private async Task<(string TokenizedText, List<Classification> Classifications)> ProcessTextCoreAsync(string text,
        AzureOpenAICredentials? azureCredentials)
    {
        var tokenizedText = text;
        var classifications = new List<Classification>();

        // Process email detections
        (tokenizedText, var emailClassifications) = ProcessEmails(text, tokenizedText);
        classifications.AddRange(emailClassifications);

        // Process health data detections using AI
        var aiService = GetAiService(azureCredentials);
        if (aiService == null) return (tokenizedText, classifications);
        (tokenizedText, var healthClassifications) = await ProcessHealthDataAsync(text, tokenizedText, aiService);
        classifications.AddRange(healthClassifications);

        return (tokenizedText, classifications);
    }

    private (string TokenizedText, List<Classification> Classifications) ProcessEmails(string originalText,
        string tokenizedText)
    {
        var classifications = new List<Classification>();
        var currentTokenizedText = tokenizedText;

        var matches = _emailRegex.Matches(originalText);
        foreach (Match match in matches)
        {
            var email = match.Value;
            var token = $"{{EMAIL_TOKEN_{Guid.NewGuid():N}}}";
            currentTokenizedText = currentTokenizedText.Replace(email, token, StringComparison.OrdinalIgnoreCase);
            classifications.Add(new Classification(PiiTypes.Email) { Token = token, OriginalValue = email });
        }

        return (currentTokenizedText, classifications);
    }

    private static async Task<(string TokenizedText, List<Classification> Classifications)> ProcessHealthDataAsync(
        string originalText, string tokenizedText, AzureOpenAIService aiService)
    {
        var classifications = new List<Classification>();
        var currentTokenizedText = tokenizedText;

        try
        {
            var healthDetections = await aiService.DetectHealthDataAsync(originalText);

            foreach (var detection in healthDetections)
            {
                // Check if this health term hasn't already been tokenized (e.g., as part of an email)
                if (!currentTokenizedText.Contains(detection.OriginalValue)) continue;

                var token = $"{{HEALTH_TOKEN_{Guid.NewGuid():N}}}";
                currentTokenizedText = currentTokenizedText.Replace(detection.OriginalValue, token,
                    StringComparison.OrdinalIgnoreCase);
                classifications.Add(new Classification(PiiTypes.Health)
                    { Token = token, OriginalValue = detection.OriginalValue });
            }
        }
        catch (Exception)
        {
            // Log error but continue - AI detection is optional
        }

        return (currentTokenizedText, classifications);
    }

    private AzureOpenAIService? GetAiService(AzureOpenAICredentials? azureCredentials)
    {
        // Prefer credentials from request over injected service
        if (azureCredentials != null && !string.IsNullOrEmpty(azureCredentials.Endpoint) &&
            !string.IsNullOrEmpty(azureCredentials.ApiKey))
        {
            var deployment = string.IsNullOrEmpty(azureCredentials.Deployment)
                ? "gpt-4.1-mini"
                : azureCredentials.Deployment;
            return new AzureOpenAIService(azureCredentials.Endpoint, azureCredentials.ApiKey, deployment);
        }

        // Fall back to injected service if available
        return service;
    }

    private async Task SaveSubmissionAsync(string tokenizedText, List<Classification> classifications)
    {
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
    }

    public async Task<int> GetTotalPiiEmailsAsync() =>
        await context.Classifications.CountAsync(c => c.Tag == PiiTypes.Email);

    public async Task<int> GetTotalPiiHealthDataAsync() =>
        await context.Classifications.CountAsync(c => c.Tag == PiiTypes.Health);

    public async Task<List<PiiDetection>> DetectPiiAsync(string text, AzureOpenAICredentials? azureCredentials = null)
    {
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
        var aiService = GetAiService(azureCredentials);
        if (aiService == null) return detections;
        try
        {
            var healthDetections = await aiService.DetectHealthDataAsync(text);
            detections.AddRange(healthDetections);
        }
        catch (Exception)
        {
            // Log error but don't fail - AI detection is optional
        }

        return detections;
    }

    [GeneratedRegex(@"(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", RegexOptions.Compiled, "en-US")]
    private static partial Regex EmailRegex();
}