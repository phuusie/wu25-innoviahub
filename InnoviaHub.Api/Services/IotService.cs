using InnoviaHub.Api.Options;
using InnoviaHub.Api.Services.Interfaces;
using InnoviaHub.Shared.DTOs.Iot;
using Microsoft.Extensions.Options;

namespace InnoviaHub.Api.Services;

public class IotService(
    HttpClient httpClient, 
    IOptions<IotOptions> options) 
    : IIotService
{
    private record TenantResponse(Guid Id);
    
    public async Task<IEnumerable<DeviceDto>> GetAllAsync()
    {
        var baseUrl = options.Value.DeviceRegistryUrl;
        var slug = options.Value.TenantSlug;
        
        var tenant = await httpClient.GetFromJsonAsync<TenantResponse>(
            $"{baseUrl}/api/tenants/by-slug/{slug}")
            ?? throw new KeyNotFoundException("TENANT_NOT_FOUND");

        var devices = await httpClient.GetFromJsonAsync<List<DeviceDto>>(
            $"{baseUrl}/api/tenants/{tenant.Id}/devices");

        return devices ?? [];
    }
}