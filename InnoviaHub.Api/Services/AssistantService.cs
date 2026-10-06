using System.Globalization;
using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using System.Text.Json;

namespace InnoviaHub.Api.Services;

public class AssistantService(
    ChatClient chatClient, 
    IAvailabilityService availabilityService,
    IOptions<OpeningHoursOptions> openingHours,
    ILogger<AssistantService> logger) : IAssistantService
{
    private const int MaxToolRounds = 5;
    
    private static readonly ChatTool GetAvailabilityTool = ChatTool.CreateFunctionTool(
        functionName: "get_availability",
        functionDescription: "Hämtar lediga tider för alla aktiva resurser en viss dag. " +
                             "Returnerar resursens namn, typ, antal platser och lediga intervall i svensk tid.",
        functionParameters: BinaryData.FromString(
            """
              {
                "type": "object",
                "properties": {
                  "date": {
                    "type": "string",
                    "description": "Datum i formatet YYYY-MM-DD"
                  },
                  "minCapacity": {
                    "type": "integer",
                    "description": "Minsta antal platser resursen måste ha"
                  }
                },
                "required": ["date"]
              }
            """));
    
    private string BuildSystemPrompt()
    {
        var options = openingHours.Value;
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.TimeZone);
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        var swedish = new CultureInfo("sv-SE");
        var tomorrow = now.AddDays(1);
        
        return $"""
                Du är bokningsassistent för Innovia Hub. Svara kort och vänligt på svenska.
                Du hjälper kunder att hitta lediga tider och boka lokaler. Du svarar också
                gärna på frågor om datum, veckodagar, tider och öppettider.

                Fakta:
                - Idag är det {now.ToString("dddd d MMMM yyyy", swedish)}, klockan är {now:HH:mm} (svensk tid).
                - Imorgon är det {tomorrow.ToString("dddd d MMMM yyyy", swedish)}.
                - Öppettider: {options.Open:HH:mm}–{options.Close:HH:mm} alla dagar.

                Regler:
                - För att söka lediga tider räcker datum och antal personer. Fråga inte efter
                  starttid eller längd innan du har visat vad som är ledigt.
                - Saknas datum eller antal personer, fråga efter det, en sak i taget.
                - Först när kunden vill boka en viss tid behöver du starttid och längd.
                  Fråga bara efter det som kunden inte redan har sagt.
                - Hitta aldrig på lediga tider, rum eller bokningar. Vet du inte, säg det.
                - Alla tider du nämner ska vara i svensk tid.
                - Om någon frågar om något helt annat, t.ex. väder, recept eller allmänbildning,
                  avböj vänligt och erbjud hjälp med bokning.
                - Använd verktyget get_availability för att se lediga tider. Gissa aldrig.
                - Om kunden frågar om idag och klockan är efter stängning, säg att det är stängt
                för dagen och föreslå imorgon i stället.
                """;
    }
    
    public async Task<string> AskAsync(List<ChatMessageDto> conversation)
    {
        List<ChatMessage> messages = [new SystemChatMessage(BuildSystemPrompt())];
        
        foreach (var message in conversation)
        {
            if (message.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
                messages.Add(new UserChatMessage(message.Content));
            else if (message.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
                messages.Add(new AssistantChatMessage(message.Content));
        }

        var chatOptions = new ChatCompletionOptions { Tools = { GetAvailabilityTool } };

        try
        {
            for (var round = 0; round < MaxToolRounds; round++)
            {
                ChatCompletion completion = await chatClient.CompleteChatAsync(messages, chatOptions);

                if (completion.FinishReason != ChatFinishReason.ToolCalls)
                    return completion.Content[0].Text;

                messages.Add(new AssistantChatMessage(completion));

                foreach (var toolCall in completion.ToolCalls)
                {
                    var result = await RunToolAsync(toolCall);
                    messages.Add(new ToolChatMessage(toolCall.Id, result));
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Assistenten kunde inte svara");
            return "Förlåt, något gick fel just nu. Försök igen om en stund.";
        }

        return "Förlåt, jag kunde inte slutföra din förfrågan. Försök gärna igen.";
    }

    private async Task<string> RunToolAsync(ChatToolCall toolCall)
    {
        if (toolCall.FunctionName != "get_availability")
            return """{ "error": "Okänt verktyg" }""";
        
        JsonDocument arguments;
        
        try
        {
            arguments = JsonDocument.Parse(toolCall.FunctionArguments);
        }
        catch (JsonException)
        {
            return """{ "error": "Argumenten var inte giltig JSON" }""";
        }

        using (arguments)
        {
            var root = arguments.RootElement;
        
            if (!root.TryGetProperty("date", out var dateElement) ||
                !DateOnly.TryParseExact(dateElement.GetString(), "yyyy-MM-dd", out var date))
                
                return """{ "error": "Ogiltigt datum, använd formatet YYYY-MM-DD" } """;
            
            int? minCapacity =
                root.TryGetProperty("minCapacity", out var capacityElement) &&
                capacityElement.ValueKind == JsonValueKind.Number
                    ? capacityElement.GetInt32()
                    : null;
        
            var availability = await availabilityService.GetAvailabilityAsync(null, date, minCapacity);
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById(openingHours.Value.TimeZone);

            var result = availability.Select(resource => new
            {
                resurs = resource.ResourceName,
                typ = resource.ResourceTypeName,
                platser = resource.Capacity,
                ledigt = resource.FreeSlots.Select(slot =>
                    $"{TimeZoneInfo.ConvertTimeFromUtc(slot.StartTime, timeZone):HH:mm}-" +
                    $"{TimeZoneInfo.ConvertTimeFromUtc(slot.EndTime, timeZone):HH:mm}")
            });
            
            return JsonSerializer.Serialize(result);
        }
    }
}