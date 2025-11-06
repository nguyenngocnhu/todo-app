using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TodoContext _context;
    private readonly IConfiguration _config;

    public AuthController(TodoContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Username and password are required");

        var exists = await _context.Users.AnyAsync(u => u.Username == dto.Username);
        if (exists) return Conflict("Username already taken");

        CreatePasswordHash(dto.Password, out var hash, out var salt);

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(null, new { id = user.Id });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Username and password are required");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null) return Unauthorized();

        if (!VerifyPasswordHash(dto.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized();

        var accessToken = CreateToken(user);

        // create refresh token, store hashed in DB and set cookie
        var refreshToken = GenerateRefreshToken();
        var refreshHash = ComputeSha256Hash(refreshToken);
        var rt = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _context.RefreshTokens.Add(rt);
        await _context.SaveChangesAsync();

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.None,
            Expires = rt.ExpiresAt
        };
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);

        return Ok(new { accessToken = accessToken });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
            return Unauthorized();

        var hash = ComputeSha256Hash(refreshToken);
        var tokenEntry = await _context.RefreshTokens.SingleOrDefaultAsync(r => r.TokenHash == hash);
        if (tokenEntry == null || !tokenEntry.IsActive) return Unauthorized();

        var user = await _context.Users.FindAsync(tokenEntry.UserId);
        if (user == null) return Unauthorized();

        // rotate refresh token
        tokenEntry.RevokedAt = DateTime.UtcNow;
        var newToken = GenerateRefreshToken();
        var newHash = ComputeSha256Hash(newToken);
        tokenEntry.ReplacedByToken = newHash;

        var newEntry = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _context.RefreshTokens.Add(newEntry);
        await _context.SaveChangesAsync();

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.None,
            Expires = newEntry.ExpiresAt
        };
        Response.Cookies.Append("refreshToken", newToken, cookieOptions);

        var access = CreateToken(user);
        return Ok(new { accessToken = access });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
        {
            var hash = ComputeSha256Hash(refreshToken);
            var tokenEntry = await _context.RefreshTokens.SingleOrDefaultAsync(r => r.TokenHash == hash);
            if (tokenEntry != null)
            {
                tokenEntry.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        // remove cookie
        Response.Cookies.Delete("refreshToken");
        return NoContent();
    }

    private string CreateToken(User user)
    {
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured");
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var expiryMinutes = int.TryParse(_config["Jwt:AccessTokenExpirationMinutes"], out var v) ? v : 60;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var keyBytes = Encoding.UTF8.GetBytes(key);
        var credentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
    }

    private static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
    {
        using var rng = RandomNumberGenerator.Create();
        salt = new byte[16];
        rng.GetBytes(salt);

        using var derive = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
        hash = derive.GetBytes(32);
    }

    private static bool VerifyPasswordHash(string password, byte[] hash, byte[] salt)
    {
        using var derive = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
        var computed = derive.GetBytes(32);
        return CryptographicOperations.FixedTimeEquals(computed, hash);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string ComputeSha256Hash(string raw)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(raw);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public record RegisterDto(string Username, string Password);
    public record LoginDto(string Username, string Password);
}
