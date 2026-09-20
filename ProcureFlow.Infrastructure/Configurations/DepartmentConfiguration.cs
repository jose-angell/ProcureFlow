using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
    {
        public void Configure(EntityTypeBuilder<Department> builder)
        {
            builder.ToTable("departments");

            builder.HasKey(department => department.Id);

            builder.Property(department => department.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(department => department.Name)
                .IsUnique();

            builder.Property(department => department.IsActive)
                .IsRequired();
        }
    }
}
