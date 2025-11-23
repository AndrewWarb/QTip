using System.Text.RegularExpressions;
using QTip.Data;
using QTip.Models;
using Microsoft.EntityFrameworkCore;

namespace QTip.Services;

public partial class PiiService(AppDbContext context)
{
    private readonly Regex _emailRegex = EmailRegex();

    public async Task<(string TokenizedText, List<Classification> Classifications)> ProcessTextAsync(string text)
    {
        var tokenizedText = text;
        var classifications = new List<Classification>();

        // Email detection/tokenization
        var matches = _emailRegex.Matches(text);
        foreach (Match match in matches)
        {
            var email = match.Value;
            var token = $"{{EMAIL_TOKEN_{Guid.NewGuid():N}}}";
            tokenizedText = tokenizedText.Replace(email, token, StringComparison.OrdinalIgnoreCase);
            classifications.Add(new Classification(PiiTypes.Email) { Token = token, OriginalValue = email });
        }

        // Save submission
        var submission = new Submission { TokenizedText = tokenizedText };
        context.Submissions.Add(submission);
        await context.SaveChangesAsync();

        // Link classifications
        foreach (var classification in classifications)
        {
            // Link this classification to the submission we just created for the user's text submission.
            classification.SubmissionId = submission.Id;
            // Add the classification to the database.
            context.Classifications.Add(classification);
        }

        await context.SaveChangesAsync();

        return (tokenizedText, classifications);
    }

    public async Task<int> GetTotalPiiEmailsAsync() =>
        await context.Classifications.CountAsync(c => c.Tag == PiiTypes.Email);

    public List<PiiDetection> DetectPii(string text)
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

        return detections;
    }

    [GeneratedRegex(@"(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", RegexOptions.Compiled, "en-US")]
    private static partial Regex EmailRegex();
}