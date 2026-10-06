namespace InnoviaHub.Api.Models;

public record BookingProposal(
    Guid Id, 
    Guid UserId, 
    Guid ResourceId, 
    string ResourceName, 
    DateTime StartUtc, 
    DateTime EndUtc);