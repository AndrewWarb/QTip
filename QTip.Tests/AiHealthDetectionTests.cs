using System.Text.Json;
using Xunit;

namespace QTip.Tests;

public class AiHealthDetectionTests
{
    [Fact]
    public void HealthDetectionAnalysis_DeserializesCorrectly()
    {
        // Arrange - Test the JSON structure that comes from Azure OpenAI
        const string jsonResponseWithDetections = """
                                                  {
                                                              "detections": [
                                                                  {
                                                                      "term": "diabetes"
                                                                  },
                                                                  {
                                                                      "term": "hypertension"
                                                                  }
                                                              ]
                                                          }
                                                  """;
        const string jsonResponseWithoutDetections = """{"detections": []}""";

        // Act
        var analysisWithDetections = JsonSerializer.Deserialize<HealthDetectionAnalysis>(jsonResponseWithDetections,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        var analysisWithoutDetections = JsonSerializer.Deserialize<HealthDetectionAnalysis>(
            jsonResponseWithoutDetections,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        // Assert
        Assert.NotNull(analysisWithDetections);
        Assert.Equal(2, analysisWithDetections!.Detections.Length);
        Assert.Equal("diabetes", analysisWithDetections.Detections[0].Term);
        Assert.Equal("hypertension", analysisWithDetections.Detections[1].Term);

        Assert.NotNull(analysisWithoutDetections);
        Assert.Empty(analysisWithoutDetections!.Detections);
    }

    // Helper classes for testing (matching the internal classes in AzureOpenAIService)
    private class HealthDetectionAnalysis
    {
        public HealthDetectionItem[] Detections { get; init; } = [];
    }

    private class HealthDetectionItem
    {
        public string? Term { get; set; }
    }
}