namespace InnoviaHub.Shared.DTOs.Iot;

public class DeviceDto
{
    public Guid Id { get; set; }
    public Guid? RoomId { get; set; }
    public string Model { get; set; } = string.Empty;
    public string Serial { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}