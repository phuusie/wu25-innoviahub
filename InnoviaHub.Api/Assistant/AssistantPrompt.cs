using System.Globalization;
using InnoviaHub.Api.Options;
using Microsoft.Extensions.Options;

namespace InnoviaHub.Api.Assistant;

public class AssistantPrompt(IOptions<OpeningHoursOptions> openingHours)
{
    private static readonly CultureInfo Swedish = new("sv-SE");

    private static readonly string Instructions = File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "Assistant", "Prompts", "instructions.md"));

    public string Build()
    {
        return $"""
            {Instructions}

            ## Fakta
            {BuildFacts()}
            """;
    }

    private string BuildFacts()
    {
        var options = openingHours.Value;
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.TimeZone);
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        var tomorrow = now.AddDays(1);

        return $"""
            - Idag är det {now.ToString("dddd d MMMM yyyy", Swedish)}, klockan är {now:HH:mm} (svensk tid).
            - Imorgon är det {tomorrow.ToString("dddd d MMMM yyyy", Swedish)}.
            - Öppettider: {options.Open:HH:mm}–{options.Close:HH:mm} alla dagar.
            - {BuildOpenStatus(options, TimeOnly.FromDateTime(now))}
            """;
    }

    private static string BuildOpenStatus(OpeningHoursOptions options, TimeOnly currentTime)
    {
        if (options.IsOpenAt(currentTime))
            return $"Just nu är det ÖPPET (stänger {options.Close:HH:mm} idag).";

        if (currentTime < options.Open)
            return $"Just nu är det STÄNGT. Vi öppnar {options.Open:HH:mm} idag.";

        return $"Just nu är det STÄNGT för dagen. Vi öppnar {options.Open:HH:mm} imorgon.";
    }
}