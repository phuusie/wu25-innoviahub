using InnoviaHub.Shared.DTOs.Availability;

namespace InnoviaHub.Api.Services.Interfaces;

public interface IAvailabilityService
{
    Task<IEnumerable<ResourceAvailabilityDto>> GetAvailabilityAsync(Guid? resourceTypeId, DateOnly date, int? minCapacity);
}