namespace InnoviaHub.Api.Options;

public class OpeningHoursOptions
{
    public TimeOnly Open { get; set; }
    public TimeOnly Close { get; set; }
    public string TimeZone { get; set; } = string.Empty;
    public bool IsOpenAt(TimeOnly time) => time >= Open && time < Close;
}