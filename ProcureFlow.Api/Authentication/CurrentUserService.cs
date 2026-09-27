using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Domain.Enums;
using System.Security.Claims;

namespace ProcureFlow.Api.Authentication
{
    public sealed class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public bool IsAuthenticated =>
            _httpContextAccessor.HttpContext?
                .User
                .Identity?
                .IsAuthenticated == true;

        public Guid UserId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier);

                if (!Guid.TryParse(value, out var userId))
                    throw new UnauthorizedException(
                        "El usuario no está autenticado.");

                return userId;
            }
        }

        public string? Email =>
            _httpContextAccessor.HttpContext?
                .User
                .FindFirstValue(ClaimTypes.Email);

        public UserRole Role
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.Role);

                if (!Enum.TryParse<UserRole>(value, out var role))
                    throw new UnauthorizedException(
                        "El rol del usuario no es válido.");

                return role;
            }
        }
    }
}
