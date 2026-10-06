using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.DataAccess.Entities;
using InnoviaHub.DataAccess.Repositories.Interfaces;
using InnoviaHub.Shared.DTOs.Availability;
using Microsoft.Extensions.Options;

namespace InnoviaHub.Api.Services;

public class AvailabilityService(
    IResourceRepository resourceRepository,
    IBookingRepository bookingRepository, 
    IOptions<OpeningHoursOptions> options)
    : IAvailabilityService
{
    public async Task<IEnumerable<ResourceAvailabilityDto>> GetAvailabilityAsync(Guid? resourceTypeId, DateOnly date, int? minCapacity)
    {
        var openingHours = options.Value;
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(openingHours.TimeZone);
        
        var dayStartUtc = TimeZoneInfo.ConvertTimeToUtc(
            date.ToDateTime(openingHours.Open), timeZone);
        var dayEndUtc = TimeZoneInfo.ConvertTimeToUtc(
            date.ToDateTime(openingHours.Close), timeZone);

        var resources = (await resourceRepository.GetAllAsync())
            .Where(r => r.IsActive)
            .Where(r => minCapacity is null || r.Capacity >= minCapacity)
            .Where(r => resourceTypeId is null || r.ResourceTypeId == resourceTypeId);

        var bookings = await bookingRepository.GetActiveInRangeAsync(dayStartUtc, dayEndUtc);

        var result = new List<ResourceAvailabilityDto>();

        foreach (var resource in resources)
        {
            var resourceBookings = bookings
                .Where(b => b.ResourceId == resource.Id)
                .OrderBy(b => b.StartTime);
            
            result.Add(new ResourceAvailabilityDto
            {
                ResourceId = resource.Id,
                ResourceName = resource.Name,
                ResourceTypeName =  resource.ResourceType.Name,
                Capacity = resource.Capacity,
                FreeSlots = FindFreeSlots(resourceBookings, dayStartUtc, dayEndUtc),
            });
        }
        
        return result;
    }

    private static List<TimeSlotDto> FindFreeSlots(
        IEnumerable<Booking> bookings, DateTime dayStartUtc, DateTime dayEndUtc)
    {
        var freeSlots = new List<TimeSlotDto>();
        var cursor = dayStartUtc;

        foreach (var booking in bookings)
        {
            if (booking.StartTime > cursor)
                freeSlots.Add(new TimeSlotDto { StartTime = cursor, EndTime = booking.StartTime });
            
            if (booking.EndTime > cursor)
                cursor = booking.EndTime;
        }
        
        if (cursor < dayEndUtc)
            freeSlots.Add(new TimeSlotDto { StartTime = cursor, EndTime = dayEndUtc });
        
        return freeSlots;
    }
}