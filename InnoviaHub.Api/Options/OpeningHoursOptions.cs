namespace InnoviaHub.Api.Options;

public class OpeningHoursOptions
{
    public TimeOnly Open { get; set; }
    public TimeOnly Close { get; set; }
    public string TimeZone { get; set; } = string.Empty;
}