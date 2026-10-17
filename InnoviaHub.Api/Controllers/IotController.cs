using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Iot;
using InnoviaHub.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoviaHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = nameof(UserRoles.Admin))]
public class IotController(IIotService iotService) : ControllerBase
{
    [HttpGet("devices")]
    public async Task<ActionResult<IEnumerable<DeviceDto>>> GetAll()
    {
        var devices = await iotService.GetAllAsync();
        return Ok(devices);
    }
}