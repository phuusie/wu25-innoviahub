using System.Security.Claims;
using InnoviaHub.Api.Hubs;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Assistant;
using InnoviaHub.Shared.DTOs.Booking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace InnoviaHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssistantController(
    IAssistantService assistantService,
    IHubContext<NotificationHub> hubContext) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (!Guid.TryParse(userId, out var id))
            throw new UnauthorizedAccessException();
        
        return id;
    }
    
    [HttpPost("chat")]
    [EnableRateLimiting("assistant")]
    public async Task<ActionResult<AssistantResponseDto>> Chat([FromBody] AssistantRequestDto dto)
    {
        if (dto.Messages.Count == 0 || !dto.Messages[^1].Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            return BadRequest();
        
        if (dto.Messages.Count > 30 || dto.Messages.Any(m => m.Content.Length > 1000))
            return BadRequest();
        
        var response = await assistantService.AskAsync(GetCurrentUserId(), dto.Messages);
        
        return Ok(response);
    }

    [HttpPost("confirm/{proposalId:guid}")]
    public async Task<ActionResult<BookingDto>> Confirm(Guid proposalId)
    {
        var booking = await assistantService.ConfirmAsync(GetCurrentUserId(), proposalId);
        
        await hubContext.Clients.All.SendAsync("BookingCreated", booking);
        
        return Ok(booking);
    }
}