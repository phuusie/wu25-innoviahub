using System.Globalization;
using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using System.Text.Json;
using InnoviaHub.Api.Models;
using InnoviaHub.DataAccess.Repositories.Interfaces;
using InnoviaHub.Shared.DTOs.Booking;
using Microsoft.Extensions.Caching.Memory;

namespace InnoviaHub.Api.Services;

public class AssistantService(
    ChatClient chatClient, 
    IAvailabilityService availabilityService,
    IOptions<OpeningHoursOptions> openingHours,
    ILogger<AssistantService> logger,
    IBookingService bookingService,
    IResourceRepository resourceRepository,
    IMemoryCache cache) : IAssistantService
{
    private const int MaxToolRounds = 5;
    private static readonly TimeSpan ProposalLifetime = TimeSpan.FromMinutes(10);
    private BookingProposal? _proposal;
    
    private static readonly ChatTool GetAvailabilityTool = ChatTool.CreateFunctionTool(
        functionName: "get_availability",
        functionDescription:
            "Hämtar lediga tider för alla aktiva resurser en viss dag. " +
            "Returnerar resursens id, namn, typ, antal platser och lediga intervall i svensk tid.",
        functionParameters: BinaryData.FromString("""
              {
                "type": "object",
                "properties": {
                  "date":        { "type": "string",  "description": "Datum i formatet YYYY-MM-DD" },
                  "minCapacity": { "type": "integer", "description": "Minsta antal platser resursen måste ha" }
                },
                "required": ["date"]
              }
            """));

    private static readonly ChatTool ProposeBookingTool = ChatTool.CreateFunctionTool(
        functionName: "propose_booking",
        functionDescription:
            "Skapar ett bokningsförslag som kunden sedan bekräftar med en knapp. " +
            "Använd när kunden har valt resurs, datum, starttid och sluttid. " +
            "Bokar INTE direkt. Returnerar ett fel om tiden inte går att boka.",
        functionParameters: BinaryData.FromString("""
                  {
                    "type": "object",
                    "properties": {
                      "resourceId": { "type": "string", "description": "Resursens id från get_availability" },
                      "date":       { "type": "string", "description": "Datum i formatet YYYY-MM-DD" },
                      "startTime":  { "type": "string", "description": "Starttid i svensk tid, formatet HH:mm" },
                      "endTime":    { "type": "string", "description": "Sluttid i svensk tid, formatet HH:mm" }
                    },
                    "required": ["resourceId", "date", "startTime", "endTime"]
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
                - När kunden vill boka och resurs, datum, starttid och sluttid är kända:
                    anropa propose_booking DIREKT. Fråga inte "vill du bekräfta?" i text,
                    bekräftelsen sker med knappen "Ja, boka" som visas automatiskt.
                - Säg aldrig att en bokning är gjord. Säg att kunden bekräftar med knappen "Ja, boka".
                """;
    }
    
    public async Task<AssistantResponseDto> AskAsync(Guid userId, List<ChatMessageDto> conversation)
    {
        List<ChatMessage> messages = [new SystemChatMessage(BuildSystemPrompt())];
        
        foreach (var message in conversation)
        {
            if (message.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
                messages.Add(new UserChatMessage(message.Content));
            else if (message.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
                messages.Add(new AssistantChatMessage(message.Content));
        }

        var chatOptions = new ChatCompletionOptions { Tools = { GetAvailabilityTool, ProposeBookingTool } };

        try
        {
            for (var round = 0; round < MaxToolRounds; round++)
            {
                ChatCompletion completion = await chatClient.CompleteChatAsync(messages, chatOptions);

                if (completion.FinishReason != ChatFinishReason.ToolCalls)
                    return new AssistantResponseDto
                    {
                        Reply = completion.Content[0].Text,
                        Proposal = _proposal is null
                            ? null
                            : new BookingProposalDto
                            {
                                Id = _proposal.Id,
                                ResourceName = _proposal.ResourceName,
                                StartTime = _proposal.StartUtc,
                                EndTime = _proposal.EndUtc
                            }
                    };

                messages.Add(new AssistantChatMessage(completion));

                foreach (var toolCall in completion.ToolCalls)
                {
                    var result = await RunToolAsync(toolCall, userId);
                    messages.Add(new ToolChatMessage(toolCall.Id, result));
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Assistenten kunde inte svara");
            return new AssistantResponseDto { Reply = "Förlåt, något gick fel just nu. Försök igen om en stund." };
        }

        return new AssistantResponseDto { Reply = "Förlåt, jag kunde inte slutföra din förfrågan. Försök gärna igen." };
    }

    public async Task<BookingDto> ConfirmAsync(Guid userId, Guid proposalId)
    {
        if (!cache.TryGetValue(ProposalKey(proposalId), out BookingProposal? proposal) ||
            proposal is null ||
            proposal.UserId != userId)
            throw new KeyNotFoundException("PROPOSAL_NOT_FOUND");

        var booking = await bookingService.CreateAsync(userId, new CreateBookingDto
        {
            ResourceId = proposal.ResourceId,
            StartTime = proposal.StartUtc,
            EndTime = proposal.EndUtc,
        });
        
        cache.Remove(ProposalKey(proposalId));
        
        return booking;
    }

    private async Task<string> RunToolAsync(ChatToolCall toolCall, Guid userId)
    {
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
            return toolCall.FunctionName switch
            {
                "get_availability" => await RunAvailabilityAsync(arguments.RootElement),
                "propose_booking" => await RunProposeBookingAsync(arguments.RootElement, userId),
                _ => """{ "error": "Okänt verktyg" }"""
            };
        }
    }

    private async Task<string> RunAvailabilityAsync(JsonElement root)
    {
        if (!root.TryGetProperty("date", out var dateElement) ||
            !DateOnly.TryParseExact(dateElement.GetString(), "yyyy-MM-dd", out var date))
            return """{ "error": "Ogiltigt datum, använd formatet YYYY-MM-DD" }""";
        
        int? minCapacity =
            root.TryGetProperty("minCapacity", out var capacityElement) &&
            capacityElement.ValueKind == JsonValueKind.Number
                ? capacityElement.GetInt32()
                : null;
        
        var availability = await availabilityService.GetAvailabilityAsync(null, date, minCapacity);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(openingHours.Value.TimeZone);

        var result = availability.Select(resource => new
        {
            id = resource.ResourceId,
            resurs = resource.ResourceName,
            typ = resource.ResourceTypeName,
            platser = resource.Capacity,
            ledigt = resource.FreeSlots.Select(slot =>
                $"{TimeZoneInfo.ConvertTimeFromUtc(slot.StartTime, timeZone):HH:mm}-" +
                $"{TimeZoneInfo.ConvertTimeFromUtc(slot.EndTime, timeZone):HH:mm}")
        });
            
        return JsonSerializer.Serialize(result);
    }

    private async Task<string> RunProposeBookingAsync(JsonElement root, Guid userId)
    {
        if (!Guid.TryParse(GetString(root, "resourceId"), out var resourceId) ||
            !DateOnly.TryParseExact(GetString(root, "date"), "yyyy-MM-dd", out var date) ||
            !TimeOnly.TryParseExact(GetString(root, "startTime"), "HH:mm", out var startTime) ||
            !TimeOnly.TryParseExact(GetString(root, "endTime"), "HH:mm", out var endTime))
            return """{ "error": "Ogiltiga värden. Använd id från get_availability, YYYY-MM-DD och HH:mm" }""";
        
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(openingHours.Value.TimeZone);
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(startTime), timeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(endTime), timeZone);

        try
        {
            await bookingService.ValidateAsync(resourceId, startUtc, endUtc);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return JsonSerializer.Serialize(new { error = ex.Message });
        }

        var resource = await resourceRepository.GetByIdAsync(resourceId);

        _proposal = new BookingProposal(
            Guid.NewGuid(), userId, resourceId, resource!.Name, startUtc, endUtc);
        
        cache.Set(ProposalKey(_proposal.Id), _proposal, ProposalLifetime);
        
        return """{ "ok": true, "meddelande": "Förslaget visas för kunden med knappen 'Ja, boka'. Bokningen är INTE gjord än." }""";
    }
    
    private static string? GetString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var element) && element.ValueKind == JsonValueKind.String
            ? element.GetString()
            : null;

    private static string ProposalKey(Guid proposalId) => $"booking-proposal:{proposalId}";
}