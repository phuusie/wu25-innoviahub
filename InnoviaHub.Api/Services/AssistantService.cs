using InnoviaHub.Api.Services.Interfaces;
using OpenAI.Chat;

namespace InnoviaHub.Api.Services;

public class AssistantService(ChatClient chatClient) : IAssistantService
{
    private const string SystemPrompt =
        "Du är en bokningsassistent för Innovia Hub. " +
        "Svara kort och vänligt på svenska.";
    
    public async Task<string> AskAsync(string message)
    {
        List<ChatMessage> messages =
        [
            new SystemChatMessage(SystemPrompt),
            new UserChatMessage(message)
        ];
        
        ChatCompletion completion = await chatClient.CompleteChatAsync(messages);

        return completion.Content[0].Text;
    }
}