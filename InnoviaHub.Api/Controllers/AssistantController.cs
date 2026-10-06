using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace InnoviaHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssistantController(IAssistantService assistantService) : ControllerBase
{
    [HttpPost("chat")]
    [EnableRateLimiting("assistant")]
    public async Task<ActionResult<AssistantResponseDto>> Chat([FromBody] AssistantRequestDto dto)
    {
        if (dto.Messages.Count == 0 || !dto.Messages[^1].Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            return BadRequest();
        
        if (dto.Messages.Count > 30 || dto.Messages.Any(m => m.Content.Length > 1000))
            return BadRequest();
        
        var reply = await assistantService.AskAsync(dto.Messages);
        
        return Ok(new AssistantResponseDto { Reply = reply });
    }
}