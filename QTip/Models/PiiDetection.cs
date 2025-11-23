namespace QTip.Models;

public record PiiDetection
{
    public required string Type { get; init; }
    public required string OriginalValue { get; init; }
    public required int StartIndex { get; init; }
    public required int EndIndex { get; init; }
    public required string Tooltip { get; init; }
}