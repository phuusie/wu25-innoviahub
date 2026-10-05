using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Availability;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoviaHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AvailabilityController(IAvailabilityService availabilityService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ResourceAvailabilityDto>>> Get(
        [FromQuery] DateOnly date,
        [FromQuery] int? minCapacity,
        [FromQuery] Guid? resourceTypeId)
    {
        var availability = await availabilityService.GetAvailabilityAsync(
            resourceTypeId, date, minCapacity);
        
        return Ok(availability);
    }
}