namespace InnoviaHub.Shared.DTOs.Assistant;

public class BookingProposalDto
{
    public Guid Id { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}