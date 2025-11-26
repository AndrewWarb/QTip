using QTip.Services;
using QTip.Models;
using QTip.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace QTip.Tests;

public class PiiServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly PiiService _service;

    public PiiServiceTests()
    {
        // Create in-memory database for testing
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _service = new PiiService(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task DetectPiiAsync_ReturnsEmailDetections()
    {
        // Arrange
        const string text = "Contact john@example.com and jane@test.org for help.";

        // Act
        var detections = await _service.DetectPiiAsync(text);

        // Assert
        Assert.Equal(2, detections.Count);
        Assert.Contains(detections, d => d is { Type: PiiTypes.Email, OriginalValue: "john@example.com" });
        Assert.Contains(detections, d => d is { Type: PiiTypes.Email, OriginalValue: "jane@test.org" });
    }

    [Fact]
    public async Task DetectPiiAsync_ReturnsEmptyList_WhenNoPiiFound()
    {
        // Arrange
        const string text = "This is just plain text with no sensitive information.";

        // Act
        var detections = await _service.DetectPiiAsync(text);

        // Assert
        Assert.Empty(detections);
    }


    [Fact]
    public async Task ProcessTextAsync_SavesSubmissionAndClassifications()
    {
        // Arrange
        const string text = "Contact john@example.com for help.";

        // Act
        var (tokenizedText, classifications) = await _service.ProcessTextAsync(text);

        // Assert
        Assert.Contains("EMAIL_TOKEN_", tokenizedText);
        Assert.Single(classifications);
        Assert.Equal(PiiTypes.Email, classifications[0].Tag);
        Assert.Equal("john@example.com", classifications[0].OriginalValue);
        Assert.Contains("EMAIL_TOKEN_", classifications[0].Token);

        // Verify database persistence
        var submission = await _context.Submissions.FirstOrDefaultAsync();
        Assert.NotNull(submission);
        Assert.Equal(tokenizedText, submission.TokenizedText);

        var savedClassification = await _context.Classifications.FirstOrDefaultAsync();
        Assert.NotNull(savedClassification);
        Assert.Equal(classifications[0].Tag, savedClassification.Tag);
        Assert.Equal(submission.Id, savedClassification.SubmissionId);
    }
}