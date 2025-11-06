namespace TodoApi.Models;

public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public string? OwnerId { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("order")]
    [System.ComponentModel.DataAnnotations.Schema.Column("Order")]
    public long OrderIndex { get; set; } = 0;
}
