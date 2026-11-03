using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;

namespace ProcureFlow.Application.Auth
{
    public sealed record TokenSessionClaims(Guid UserId, string Role, Guid DepartmentId, Guid SecurityStamp);

    /// <summary>
    /// Comprueba que los claims de un JWT siguen coincidiendo con el estado actual del usuario en la BD.
    /// </summary>
    public class TokenSessionValidator
    {
        private readonly IApplicationDbContext _context;

        public TokenSessionValidator(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> IsValidAsync(TokenSessionClaims claims)
        {
            var current = await _context.Users.AsNoTracking()
                .Where(u => u.Id == claims.UserId)
                .Select(u => new
                {
                    u.Role,
                    u.DepartmentId,
                    u.IsActive,
                    u.SecurityStamp,
                    DepartmentIsActive = u.Department.IsActive
                })
                .FirstOrDefaultAsync();

            if (current is null) return false;
            if (!current.IsActive) return false;
            if (!current.DepartmentIsActive) return false;
            if (current.Role.ToString() != claims.Role) return false;
            if (current.DepartmentId != claims.DepartmentId) return false;
            if (current.SecurityStamp != claims.SecurityStamp) return false;

            return true;
        }
    }
}
