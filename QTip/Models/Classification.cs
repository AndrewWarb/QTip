namespace QTip.Models;

public class Classification(string tag)
{
    public int Id { get; init; }
    public string Token { get; init; } = string.Empty;
    public string OriginalValue { get; init; } = string.Empty;
    public string Tag { get; init; } = tag;
    public int SubmissionId { get; set; }
    public Submission? Submission { get; init; }
}