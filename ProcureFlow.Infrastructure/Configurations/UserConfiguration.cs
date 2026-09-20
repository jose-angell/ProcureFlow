using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("users");

            builder.HasKey(user => user.Id);

            builder.Property(user => user.FullName)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(user => user.Email)
                .IsRequired()
                .HasMaxLength(200);

            builder.HasIndex(user => user.Email)
                .IsUnique();

            builder.Property(user => user.PasswordHash)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(user => user.Role)
                .IsRequired();

            builder.Property(user => user.IsActive)
                .IsRequired();

            builder.Property(user => user.DepartmentId)
                .IsRequired();

            builder.Property(user => user.CreatedAt)
                .IsRequired();

            builder.HasOne(department => department.Department)
                .WithMany()
                .HasForeignKey(user => user.DepartmentId);
        }
    }
}
