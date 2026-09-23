using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.Abstractions.Security
{
    public interface ICurrentUserService
    {
        bool IsAuthenticated { get; }
        Guid UserId { get; }
        string? Email { get; }
        UserRole Role { get; }
    }
}
