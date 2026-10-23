using InnoviaHub.Shared.DTOs.Iot;

namespace InnoviaHub.Api.Services.Interfaces;

public interface IIotService
{
    Task<IEnumerable<DeviceDto>> GetAllAsync();
}