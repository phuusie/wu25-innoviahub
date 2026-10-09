namespace InnoviaHub.Api.Options;

public class OpeningHoursOptions
{
    public TimeOnly Open { get; set; }
    public TimeOnly Close { get; set; }
    public string TimeZone { get; set; } = string.Empty;
    public bool IsOpenAt(TimeOnly time) => time >= Open && time < Close;
    
    public DateTime LocalNow() => 
        ToLocal(DateTime.UtcNow);
    
    public DateTime ToLocal(DateTime utc) => 
        TimeZoneInfo.ConvertTimeFromUtc(utc, GetTimeZone());

    public DateTime ToUtc(DateOnly date, TimeOnly time) =>
        TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(time), GetTimeZone());
    
    public TimeZoneInfo GetTimeZone() =>
        TimeZoneInfo.FindSystemTimeZoneById(TimeZone);
}