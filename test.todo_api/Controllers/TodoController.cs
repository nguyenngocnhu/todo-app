using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TodoController : ControllerBase
{
    private readonly TodoContext _context;

    public TodoController(TodoContext context)
    {
        _context = context;
    }

    public record ReorderDto(int Id, long Order);

    // global todos: no GetUserId helper

    // GET: list
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TodoItem>>> GetAll()
    {
        var items = await _context.Todos.AsNoTracking()
            .OrderBy(t => t.OrderIndex)
            .ToListAsync();
        return Ok(items);
    }

    // GET: paged (keyset) - use for large lists
    // Example: GET /api/todo/page?limit=50&afterOrder=1000&afterId=42
    // GET: /api/todo/page?limit=50&page=1

    [HttpGet("page")]
    public async Task<IActionResult> GetPage([FromQuery] int limit = 50, [FromQuery] int page = 1)
    {
        if (limit <= 0) limit = 50;
        if (limit > 100) limit = 100; 
        if (page <= 0) page = 1;
        var total = await _context.Todos.CountAsync();
        int totalPages = (int)Math.Ceiling(total / (double)limit);
        if (page > totalPages) page = totalPages;
        var items = await _context.Todos.AsNoTracking()
            .OrderBy(t => t.OrderIndex)
            .ThenBy(t => t.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var normalized = items.Select(t => new
        {
            t.Id,
            t.Title,
            t.IsCompleted,
            order = t.OrderIndex
        }).ToList();

        return Ok(new
        {
            items = normalized,
            page,
            limit,
            total,
            totalPages
        });
    }
    
    // GET: by id
    [HttpGet("{id}", Name = "GetTodo")]
    public async Task<ActionResult<TodoItem>> GetById(int id)
    {
        var item = await _context.Todos.FindAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    // POST: /api/todo
    [HttpPost]
    public async Task<ActionResult<TodoItem>> Create(TodoItem todo)
    {
        // If no explicit order provided, append to the end
       if (todo.OrderIndex == 0)
        {
            var max = await _context.Todos.MaxAsync(t => (long?)t.OrderIndex) ?? 0;
            todo.OrderIndex = max + 1;
        }
        _context.Todos.Add(todo);
        await _context.SaveChangesAsync();

        return CreatedAtRoute("GetTodo", new { id = todo.Id }, todo);
    }

    // PUT: /api/todo/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TodoItem todo)
    {
        if (id != todo.Id) return BadRequest();

        var existing = await _context.Todos.FindAsync(id);
        if (existing == null) return NotFound();

        // Only allow updating specific fields
        existing.Title = todo.Title;
        existing.IsCompleted = todo.IsCompleted;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Todos.AnyAsync(e => e.Id == id))
                return NotFound();
            throw;
        }

        return Ok(existing);
    }

    // DELETE: /api/todo/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.Todos.FindAsync(id);
        if (item == null) return NotFound();

        _context.Todos.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // PATCH: reorder
    // Accepts a minimal list of id/order updates. Updates are validated and persisted in a single transaction.
    [HttpPatch("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<ReorderDto> updates)
    {
        if (updates == null || updates.Count == 0) return BadRequest("No updates provided");

        var ids = updates.Select(u => u.Id).ToList();
        var items = await _context.Todos.Where(t => ids.Contains(t.Id)).ToListAsync();

        if (items.Count != ids.Count)
            return NotFound("One or more items not found");

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            if (updates.Count > 1)
            {
                var idList = string.Join(", ", updates.Select(u => u.Id));
                var cases = string.Join(" ", updates.Select(u => $"WHEN {u.Id} THEN {u.Order}"));
                var sql = $"UPDATE Todos SET \"Order\" = CASE Id {cases} END WHERE Id IN ({idList});";
                await _context.Database.ExecuteSqlRawAsync(sql);
            }
            else
            {
                var u = updates[0];
                var item = items.Single(i => i.Id == u.Id);
                item.OrderIndex = u.Order;
                await _context.SaveChangesAsync();
            }
            await tx.CommitAsync();

            return Ok(updates);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // OPTIONS: preflight for reorder (helps browsers when preflight is ambiguous)
    [HttpOptions("reorder")]
    public IActionResult PreflightReorder()
    {
        // Explicitly advertise allowed methods for this endpoint; CORS middleware also runs.
        Response.Headers["Allow"] = "OPTIONS, PATCH";
        return Ok();
    }
}
