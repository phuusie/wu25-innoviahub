using InnoviaHub.Api.Mappings;
using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.DataAccess.Entities;
using InnoviaHub.DataAccess.Repositories.Interfaces;
using InnoviaHub.Shared.DTOs.Booking;
using Microsoft.Extensions.Options;

namespace InnoviaHub.Api.Services;

public class BookingService(
    IBookingRepository bookingRepository,
    IResourceRepository resourceRepository,
    IOptions<OpeningHoursOptions> openingHours)
    : IBookingService
{
    
    public async Task<IEnumerable<BookingDto>> GetAllAsync()
    {
        var bookings = await bookingRepository.GetAllAsync();
        return
        [
            .. bookings
                .Select(b => b.ToDto())
        ];
    }

    public async Task<BookingDto?> GetByIdAsync(Guid id)
    {
        var booking = await bookingRepository.GetByIdAsync(id);

        if (booking is null)
            return null;
        
        return booking.ToDto();
    }

    public async Task<BookingDto> CreateAsync(Guid userId, CreateBookingDto dto)
    {
        await ValidateAsync(dto.ResourceId, dto.StartTime, dto.EndTime);
        
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ResourceId = dto.ResourceId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            CreatedAt = DateTime.UtcNow,
            IsCancelled = false
        };
        
        await bookingRepository.AddAsync(booking);
        
        var createdBooking = await bookingRepository.GetByIdAsync(booking.Id);
        
        if (createdBooking is null)
            throw new KeyNotFoundException("BOOKING_NOT_FOUND");

        return createdBooking.ToDto();
    }

    public async Task<BookingDto?> UpdateAsync(Guid id, Guid userId, bool isAdmin, UpdateBookingDto dto)
    {
        var booking = await bookingRepository.GetByIdAsync(id);

        if (booking is null)
            return null;
        
        if (booking.UserId != userId && !isAdmin)
            throw new UnauthorizedAccessException();
        
        await ValidateAsync(dto.ResourceId, dto.StartTime, dto.EndTime, id);

        booking.ResourceId = dto.ResourceId;
        booking.StartTime = dto.StartTime;
        booking.EndTime = dto.EndTime;
        
        await bookingRepository.UpdateAsync(booking);
        
        var updatedBooking = await bookingRepository.GetByIdAsync(booking.Id);
        
        if (updatedBooking is null)
            throw new KeyNotFoundException("BOOKING_NOT_FOUND");
        
        return updatedBooking.ToDto();
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, bool isAdmin)
    {
        var booking = await bookingRepository.GetByIdAsync(id);

        if (booking is null)
            return false;

        if (booking.UserId != userId && !isAdmin)
            throw new UnauthorizedAccessException();
        
        await bookingRepository.DeleteAsync(booking);
        
        return true;
    }

    public async Task<bool> CancelAsync(Guid id, Guid userId, bool isAdmin)
    {
        var booking = await bookingRepository.GetByIdAsync(id);
        
        if (booking is null)
            return false;

        if (booking.UserId != userId && !isAdmin)
            throw new UnauthorizedAccessException();

        booking.IsCancelled = true;
        
        await bookingRepository.UpdateAsync(booking);
        
        return true;
    }

    public async Task ValidateAsync(Guid resourceId, DateTime startUtc, DateTime endUtc, Guid? excludingBookingId = null)
    {
        if (startUtc >= endUtc)
            throw new InvalidOperationException("INVALID_BOOKING_TIME");
        
        EnsureWithinOpeningHours(startUtc, endUtc);
        
        var resource = await resourceRepository.GetByIdAsync(resourceId);
        
        if (resource is null || !resource.IsActive)
            throw new KeyNotFoundException("RESOURCE_NOT_FOUND");

        var hasConflicts = await bookingRepository.HasConflictsAsync(
            resourceId, startUtc, endUtc, excludingBookingId);
        
        if (hasConflicts)
            throw new InvalidOperationException("RESOURCE_ALREADY_BOOKED");
    }

    private void EnsureWithinOpeningHours(DateTime startUtc, DateTime endUtc)
    {
        if (startUtc < DateTime.UtcNow)
            throw new InvalidOperationException("BOOKING_IN_PAST");
        
        var options = openingHours.Value;
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.TimeZone);
        
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(startUtc, timeZone);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(endUtc, timeZone);
        
        if (localStart.Date != localEnd.Date)
            throw new InvalidOperationException("OUTSIDE_OPENING_HOURS");
        
        var startTime = TimeOnly.FromDateTime(localStart);
        var endTime = TimeOnly.FromDateTime(localEnd);
        
        if (startTime < options.Open || endTime > options.Close)
            throw new InvalidOperationException("OUTSIDE_OPENING_HOURS");
    }
}