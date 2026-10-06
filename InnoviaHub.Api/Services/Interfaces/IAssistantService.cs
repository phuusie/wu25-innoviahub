using InnoviaHub.Shared.DTOs.Assistant;

namespace InnoviaHub.Api.Services.Interfaces;

public interface IAssistantService
{
    Task<string> AskAsync(List<ChatMessageDto> conversation);
}