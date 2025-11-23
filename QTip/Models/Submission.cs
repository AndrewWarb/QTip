namespace QTip.Models;

public class Submission
{
    public int Id { get; init; }
    public string TokenizedText { get; init; } = string.Empty;
    
    // Included for compliance (eg. GDPR) (when was data processed?)
    public DateTime SubmittedAt { get; init; } = DateTime.UtcNow;
    
    public List<Classification> Classifications { get; init; } = [];
}