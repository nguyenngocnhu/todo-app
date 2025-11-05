using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodoController : ControllerBase
{
    private readonly TodoContext _context;

    public TodoController(TodoContext context)
    {
        _context = context;
    }

    // GET: /api/todo
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TodoItem>>> GetAll()
    {
        var items = await _context.Todos.AsNoTracking().ToListAsync();
        return Ok(items);
    }

    // GET: /api/todo/{id}
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
        _context.Todos.Add(todo);
        await _context.SaveChangesAsync();

        return CreatedAtRoute("GetTodo", new { id = todo.Id }, todo);
    }

    // PUT: /api/todo/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TodoItem todo)
    {
        if (id != todo.Id) return BadRequest();

        var exists = await _context.Todos.AnyAsync(t => t.Id == id);
        if (!exists) return NotFound();

        _context.Entry(todo).State = EntityState.Modified;

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

            // Return the updated entity so frontend can use the fresh data
            var updated = await _context.Todos.FindAsync(id);
            return Ok(updated);
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
}
