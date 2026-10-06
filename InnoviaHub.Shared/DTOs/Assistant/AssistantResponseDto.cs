namespace InnoviaHub.Shared.DTOs.Assistant;

public class AssistantResponseDto
{
    public string Reply { get; set; } = string.Empty;
    public BookingProposalDto? Proposal { get; set; } 
}