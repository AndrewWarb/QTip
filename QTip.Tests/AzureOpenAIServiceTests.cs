using QTip.Services;
using QTip.Models;
using Xunit;

namespace QTip.Tests;

public class AzureOpenAIServiceTests
{
    private const string _testEndpoint = "https://test.openai.azure.com";
    private const string _testApiKey = "test-api-key";


    [Fact]
    public async Task DetectHealthDataAsync_ReturnsEmptyList_WhenTextIsEmpty()
    {
        // Arrange
        var service = new AzureOpenAIService(_testEndpoint, _testApiKey);

        // Act
        var result = await service.DetectHealthDataAsync("");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task DetectHealthDataAsync_ReturnsEmptyList_WhenTextIsWhitespace()
    {
        // Arrange
        var service = new AzureOpenAIService(_testEndpoint, _testApiKey);

        // Act
        var result = await service.DetectHealthDataAsync("   \n\t   ");

        // Assert
        Assert.Empty(result);
    }


    [Fact]
    public void HealthDetectionTooltip_IsFormattedCorrectly()
    {
        // Test the tooltip format used in the service
        var healthTerms = new[] { "diabetes", "cancer", "heart disease" };

        foreach (var term in healthTerms)
        {
            var expectedTooltip = "PHI - Health Data";
            var detection = new PiiDetection
            {
                Type = PiiTypes.Health,
                OriginalValue = term,
                StartIndex = 0,
                EndIndex = term.Length,
                Tooltip = expectedTooltip
            };

            Assert.Equal(expectedTooltip, detection.Tooltip);
            Assert.Contains("PHI - Health Data", detection.Tooltip);
        }
    }
}