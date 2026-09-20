using ProcureFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

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
