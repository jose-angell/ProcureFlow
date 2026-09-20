using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class PurchaseRequestConfiguration : IEntityTypeConfiguration<PurchaseRequest>
    {
        public void Configure(EntityTypeBuilder<PurchaseRequest> builder)
        {
            builder.ToTable("purchase_requests");

            builder.HasKey(pr => pr.Id);

            builder.Property(pr => pr.RequestNumber)
                .IsRequired()
                .HasMaxLength(30);

            builder.HasIndex(pr => pr.RequestNumber)
                .IsUnique();

            builder.Property(pr => pr.RequestedByUserId)
                .IsRequired();

            builder.Property(pr => pr.DepartmentId)
                .IsRequired();

            builder.Property(pr => pr.Status)
                .IsRequired();

            builder.Property(pr => pr.Priority)
                .IsRequired();

            builder.Property(pr => pr.Justification)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(pr => pr.TotalAmount)
                .HasColumnType("decimal(18,2)");

            builder.Property(pr => pr.CreatedAt)
                .IsRequired();

            builder.Property(pr => pr.SubmittedAt);

            builder.Property(pr => pr.ApprovedAt);

            builder.Property(pr => pr.RejectedAt);

            builder.Property(pr => pr.CancelledAt);

            builder.HasOne(user => user.RequestedByUser)
                .WithMany()
                .HasForeignKey(pr => pr.RequestedByUserId);

            builder.HasOne(department => department.Department)
                .WithMany()
                .HasForeignKey(pr => pr.DepartmentId);

            builder.HasMany(pr => pr.Items)
                .WithOne()
                .HasForeignKey(item => item.PurchaseRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(pr => pr.ApprovalDecision)
                .WithOne()
                .HasForeignKey<ApprovalDecision>(ad => ad.PurchaseRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
