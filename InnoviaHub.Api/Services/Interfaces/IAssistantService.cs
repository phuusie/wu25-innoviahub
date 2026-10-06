using InnoviaHub.Shared.DTOs.Assistant;
using InnoviaHub.Shared.DTOs.Booking;

namespace InnoviaHub.Api.Services.Interfaces;

public interface IAssistantService
{
    Task<AssistantResponseDto> AskAsync(Guid userId, List<ChatMessageDto> conversation);
    Task<BookingDto> ConfirmAsync(Guid userId, Guid proposalId);
}