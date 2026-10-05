namespace InnoviaHub.Shared.DTOs.Availability;

public class ResourceAvailabilityDto
{
    public Guid ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceTypeName { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public List<TimeSlotDto> FreeSlots { get; set; } = [];
}