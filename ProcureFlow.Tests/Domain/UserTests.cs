using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Tests.Domain
{
    public class UserTests
    {
        private static User CreateUser() =>
            new("Ana Pérez", "ana@test.com", "hash-original", UserRole.Requester, Guid.NewGuid());

        [Fact]
        public void Constructor_ShouldGenerateSecurityStamp()
        {
            var user = CreateUser();

            Assert.NotEqual(Guid.Empty, user.SecurityStamp);
        }

        [Fact]
        public void Update_ShouldRegenerateSecurityStamp_WhenPasswordHashChanges()
        {
            var user = CreateUser();
            var originalStamp = user.SecurityStamp;

            user.Update(user.FullName, user.Email, "hash-nuevo", user.Role, user.DepartmentId);

            Assert.NotEqual(originalStamp, user.SecurityStamp);
            Assert.NotEqual(Guid.Empty, user.SecurityStamp);
        }

        [Fact]
        public void Update_ShouldKeepSecurityStamp_WhenPasswordHashDoesNotChange()
        {
            var user = CreateUser();
            var originalStamp = user.SecurityStamp;

            user.Update("Ana María Pérez", "ana.maria@test.com", user.PasswordHash, UserRole.Approver, Guid.NewGuid());

            Assert.Equal(originalStamp, user.SecurityStamp);
        }

        [Fact]
        public void ActivateDeactivateAndChangeDepartment_ShouldKeepSecurityStamp()
        {
            var user = CreateUser();
            var originalStamp = user.SecurityStamp;

            user.Deactivate();
            user.Activate();
            user.ChangeDepartment(Guid.NewGuid());

            Assert.Equal(originalStamp, user.SecurityStamp);
        }
    }
}
