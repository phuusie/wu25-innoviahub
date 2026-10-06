using System.Security.Claims;
using System.Threading.RateLimiting;
using InnoviaHub.Api.Data;
using InnoviaHub.Api.Extensions;
using InnoviaHub.Api.Handler;
using InnoviaHub.DataAccess;
using InnoviaHub.DataAccess.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using InnoviaHub.Api.Hubs;
using InnoviaHub.Api.Options;
using OpenAI.Chat;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration["SQL_ConnectionString"] 
    ?? throw new InvalidOperationException("SQL_CONNECTION_STRING IS MISSING");

var frontendUrl = builder.Configuration["FRONTEND_URL"]
    ?? "http://localhost:5173";

var openAiKey = builder.Configuration["OPENAI_API_KEY"]
    ?? throw new InvalidOperationException("OPENAI_API_KEY IS MISSING");

var openAiModel = builder.Configuration["OpenAI:Model"]
    ?? throw new InvalidOperationException("OPENAI_MODEL IS MISSING");

builder.Services.AddSingleton(new ChatClient(openAiModel, openAiKey));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("assistant", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
            }));
});

builder.Services.AddCors(options =>
{
   options.AddPolicy("Frontend",policy =>
   {
       policy
       .WithOrigins(frontendUrl)
       .AllowAnyHeader()
       .AllowAnyMethod()
       .AllowCredentials();
   });
});

builder.Services.AddDbContext<InnoviaHubDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddIdentity<User, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<InnoviaHubDbContext>();

builder.Services.Configure<OpeningHoursOptions>(
    builder.Configuration.GetSection("OpeningHours"));

builder.Services.AddAuthorization();

builder.Services.AddApplicationServices();
builder.Services.AddApplicationRepositories();
builder.Services.AddSignalR();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext =
        scope.ServiceProvider.GetRequiredService<InnoviaHubDbContext>();

    await dbContext.Database.MigrateAsync();

    var roleManager =
        scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

    var userManager =
        scope.ServiceProvider.GetRequiredService<UserManager<User>>();

    await IdentitySeeder.SeedRolesAsync(roleManager);
    await IdentitySeeder.SeedAdminAsync(userManager, builder.Configuration);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseHttpsRedirection();
}

app.UseExceptionHandler();

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");// med detta får klienten anslutning till loclahosten

app.MapGet("/api/ping", () => Results.Ok(new
{
    Message = "API is working",
    Timestamp = DateTime.UtcNow
}));

app.Run();
