using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoviaHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssistantController(IAssistantService assistantService) : ControllerBase
{
    [HttpPost("chat")]
    public async Task<ActionResult<AssistantResponseDto>> Chat([FromBody] AssistantRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest();
        
        var reply = await assistantService.AskAsync(dto.Message);
        
        return Ok(new AssistantResponseDto { Reply = reply });
    }
}