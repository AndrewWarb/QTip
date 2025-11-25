namespace QTip.Models;

public record SubmissionRequest(string Text, AzureOpenAICredentials? AzureOpenAI = null);