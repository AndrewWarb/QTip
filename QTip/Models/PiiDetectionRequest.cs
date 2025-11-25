namespace QTip.Models;

public record PiiDetectionRequest(string Text, AzureOpenAICredentials? AzureOpenAI = null);

public record AzureOpenAICredentials(string Endpoint, string ApiKey, string? Deployment = null);
