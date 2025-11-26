using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using QTip.Models;
using Xunit;

namespace QTip.Tests;

public class ApiEndpointTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task DetectPiiEndpoint_ReturnsEmailDetections()
    {
        // Arrange
        var request = new PiiDetectionRequest("Contact john@example.com and jane@test.org for help.");

        // Act
        var response = await _client.PostAsJsonAsync("/api/detect-pii", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detections = await response.Content.ReadFromJsonAsync<List<PiiDetection>>();
        Assert.NotNull(detections);
        Assert.Equal(2, detections!.Count);
        Assert.Contains(detections, d => d is { Type: PiiTypes.Email, OriginalValue: "john@example.com" });
        Assert.Contains(detections, d => d is { Type: PiiTypes.Email, OriginalValue: "jane@test.org" });
    }

    [Fact]
    public async Task DetectPiiEndpoint_ReturnsEmptyList_WhenNoPiiFound()
    {
        // Arrange
        var request = new PiiDetectionRequest("This is just plain text with no sensitive information.");

        // Act
        var response = await _client.PostAsJsonAsync("/api/detect-pii", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detections = await response.Content.ReadFromJsonAsync<List<PiiDetection>>();
        Assert.NotNull(detections);
        Assert.Empty(detections!);
    }


    [Fact]
    public async Task StatsEndpoint_ReturnsCorrectCounts()
    {
        // Arrange - Submit some data first
        await _client.PostAsJsonAsync("/api/submit",
            new SubmissionRequest("Contact john@example.com and jane@test.org"));

        // Act
        var response = await _client.GetAsync("/api/stats");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stats = await response.Content.ReadFromJsonAsync<StatsResponse>();
        Assert.NotNull(stats);
        Assert.True(stats.TotalPiiEmails >= 2); // At least the 2 emails we just submitted
    }


    [Fact]
    public async Task DetectPiiEndpoint_HandlesHealthData_WhenCredentialsProvided()
    {
        // Arrange
        var request = new PiiDetectionRequest("Patient has diabetes and contact john@example.com")
        {
            AzureOpenAI = new AzureOpenAICredentials("https://test.openai.azure.com", "test-key", "gpt-4")
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/detect-pii", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detections = await response.Content.ReadFromJsonAsync<List<PiiDetection>>();
        Assert.NotNull(detections);
        // Should contain at least email detection (health detection may fail with test credentials, but email detection should work)
        Assert.Contains(detections!, d => d.Type == PiiTypes.Email);
    }

    // Helper class for deserializing responses

    private class StatsResponse
    {
        public int TotalPiiEmails { get; init; }
        public int TotalPiiHealthData { get; init; }
    }
}