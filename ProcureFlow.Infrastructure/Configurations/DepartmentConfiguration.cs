using Microsoft.EntityFrameworkCore;
using ProcureFlow.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class DepartmentConfiguration: IEntityTypeConfiguration<Department>
    {
        public void Configure(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<Department> builder)
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
