using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.Auth.Dtos
{
    public class AuthResponse
    {
        public string AccessToken { get; set; }
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public UserRole Role { get; set; }
        public Guid DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
    }
}
