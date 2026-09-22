using Microsoft.AspNetCore.Identity;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Infrastructure.Security
{
    public class PasswordHashService : IPasswordHashService
    {
        private readonly PasswordHasher<User> _passwordHasher = new();

        public string Hash(string password)
        {
            return _passwordHasher.HashPassword(user: null!, password);
        }
        public bool Verify(string password, string passwordHash)
        {
            var result = _passwordHasher.VerifyHashedPassword(
                user: null!,
                hashedPassword: passwordHash,
                providedPassword: password);

            return result == PasswordVerificationResult.Success ||
                   result == PasswordVerificationResult.SuccessRehashNeeded;
        }

    }
}
