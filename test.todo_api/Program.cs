using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Allow CORS for the frontend dev servers (adjust origins for production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDev", policy =>
    {
        // Allow the common frontend dev origins and the static-serve port 3000 used for grading
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .WithHeaders("Authorization", "Content-Type", "Accept")
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure JWT authentication (reads settings from appsettings or environment)
var jwtKey = builder.Configuration["Jwt:Key"];
if (!string.IsNullOrEmpty(jwtKey))
{
    var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
        };
    });

    builder.Services.AddAuthorization();
}

// Register EF Core DbContext with SQLite. Read connection string from configuration
builder.Services.AddDbContext<TodoApi.Data.TodoContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("TodoConnection") ?? "Data Source=todo.db"));

var app = builder.Build();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TodoApi.Data.TodoContext>();
    await db.Database.EnsureCreatedAsync();
}

// Configure the HTTP request pipeline. Enable Swagger and serve it at the app root (/)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Todo API v1");
    c.RoutePrefix = string.Empty; // open Swagger at application root
});

app.UseHttpsRedirection();

// Enable CORS (dev policy)
app.UseCors("AllowDev");

// Enable authentication middleware if configured
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
await app.RunAsync();
