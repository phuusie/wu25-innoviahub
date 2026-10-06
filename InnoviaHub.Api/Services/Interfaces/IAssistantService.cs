namespace InnoviaHub.Api.Services.Interfaces;

public interface IAssistantService
{
    Task<string> AskAsync(string message);
}