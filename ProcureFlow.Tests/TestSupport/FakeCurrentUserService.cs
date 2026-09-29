using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Tests.TestSupport
{
    public sealed class FakeCurrentUserService
     : ICurrentUserService
    {
        public FakeCurrentUserService(
            Guid userId,
            UserRole role)
        {
            UserId = userId;
            Role = role;
        }

        public bool IsAuthenticated => true;

        public Guid UserId { get; }

        public string? Email => "test@example.com";

        public UserRole Role { get; }
    }
}
