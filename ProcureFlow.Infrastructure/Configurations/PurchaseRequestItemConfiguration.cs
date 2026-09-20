using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProcureFlow.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class PurchaseRequestItemConfiguration : IEntityTypeConfiguration<PurchaseRequestItem>
    {
        public void Configure(EntityTypeBuilder<PurchaseRequestItem> builder)
        {
            builder.ToTable("purchase_request_items");
            builder.HasKey(item => item.Id);
            builder.Property(item => item.PurchaseRequestId)
                .IsRequired();
            builder.Property(item => item.Description)
                .IsRequired()
                .HasMaxLength(500);
            builder.Property(item => item.Quantity)
                .IsRequired();
            builder.Property(item => item.UnitPrice)
                .IsRequired()
                .HasColumnType("decimal(18,2)");

            builder.HasOne(item => item.PurchaseRequest)
                 .WithMany(request => request.Items)
                 .HasForeignKey(item => item.PurchaseRequestId)
                 .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
