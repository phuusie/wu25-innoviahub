using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using System.Text.Json;
using InnoviaHub.Api.Assistant;
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
    IMemoryCache cache,
    AssistantPrompt prompt) : IAssistantService
{
    private const int MaxToolRounds = 5;
    private static readonly TimeSpan ProposalLifetime = TimeSpan.FromMinutes(10);
    private BookingProposal? _proposal;
    private static string ProposalKey(Guid proposalId) => $"booking-proposal:{proposalId}";
    private static string LatestProposalKey(Guid userId) => $"latest-proposal:{userId}";
    
    private static string? GetString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var element) && element.ValueKind == JsonValueKind.String
            ? element.GetString()
            : null;
    
    public async Task<AssistantResponseDto> AskAsync(Guid userId, List<ChatMessageDto> conversation)
    {
        List<ChatMessage> messages = [new SystemChatMessage(prompt.Build())];
        
        foreach (var message in conversation)
        {
            if (message.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
                messages.Add(new UserChatMessage(message.Content));
            else if (message.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
                messages.Add(new AssistantChatMessage(message.Content));
        }

        var chatOptions = new ChatCompletionOptions { Tools =
        {
            AssistantTools.GetAvailabilityTool, 
            AssistantTools.ProposeBookingTool
        } };

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
                    logger.LogInformation("AI anropar {Tool} med {Arguments}",
                        toolCall.FunctionName, toolCall.FunctionArguments.ToString());

                    var result = await RunToolAsync(toolCall, userId);

                    logger.LogInformation("{Tool} svarade {Result}", toolCall.FunctionName, result);

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
            proposal.UserId != userId ||
            !cache.TryGetValue(LatestProposalKey(userId), out Guid latestId) ||
            latestId != proposalId)
            throw new KeyNotFoundException("PROPOSAL_NOT_FOUND");

        var booking = await bookingService.CreateAsync(userId, new CreateBookingDto
        {
            ResourceId = proposal.ResourceId,
            StartTime = proposal.StartUtc,
            EndTime = proposal.EndUtc,
        });
        
        cache.Remove(ProposalKey(proposalId));
        cache.Remove(LatestProposalKey(userId));
        
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
                AssistantTools.GetAvailability => await RunAvailabilityAsync(arguments.RootElement),
                AssistantTools.ProposeBooking => await RunProposeBookingAsync(arguments.RootElement, userId),
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
        cache.Set(LatestProposalKey(userId), _proposal.Id, ProposalLifetime);
        
        return """{ "ok": true, "meddelande": "Förslaget visas för kunden med knappen 'Ja, boka'. Bokningen är INTE gjord än." }""";
    }
}
