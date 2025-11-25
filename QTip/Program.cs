using Microsoft.EntityFrameworkCore;
using QTip.Data;
using QTip.Models;
using QTip.Services;

var builder = WebApplication.CreateBuilder(args);

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<PiiService>(); // Scoped per request - appropriate for services that use DbContext

// AI Service (optional - only if Azure OpenAI credentials are provided)
var azureOpenAiEndpoint = builder.Configuration["AzureOpenAI:Endpoint"];
var azureOpenAiKey = builder.Configuration["AzureOpenAI:ApiKey"];
if (!string.IsNullOrEmpty(azureOpenAiEndpoint) && !string.IsNullOrEmpty(azureOpenAiKey))
{
    builder.Services.AddSingleton(new AzureOpenAIService(azureOpenAiEndpoint, azureOpenAiKey));
}

// CORS (permissive as this is not being deployed into production)
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Swagger (added for testing)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Run database migrations automatically
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await dbContext.Database.MigrateAsync();
    }
    catch (Exception)
    {
        // Continue - it is possible the tables already exist and this caused a timeout.
    }
}

if (app.Environment.IsDevelopment())
    app.UseSwagger().UseSwaggerUI();

app.UseCors();

app.MapPost("/api/detect-pii", async (PiiService service, PiiDetectionRequest request) =>
    Results.Ok(await service.DetectPiiAsync(request.Text, request.AzureOpenAI)));

app.MapPost("/api/submit", async (PiiService service, SubmissionRequest request) =>
{
    var (tokenized, _) = await service.ProcessTextAsync(request.Text, request.AzureOpenAI);
    return Results.Ok(new { tokenizedText = tokenized });
}).DisableAntiforgery();

app.MapGet("/api/stats", async (PiiService service) =>
    Results.Ok(new
    {
        totalPiiEmails = await service.GetTotalPiiEmailsAsync(),
        totalPiiHealthData = await service.GetTotalPiiHealthDataAsync()
    }));

app.Run();