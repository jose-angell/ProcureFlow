using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Infrastructure.Configurations
{
    public class ApprovalDecisionConfiguration : IEntityTypeConfiguration<ApprovalDecision>
    {
        public void Configure(EntityTypeBuilder<ApprovalDecision> builder)
        {
            builder.ToTable("approval_decisions");
            builder.HasKey(decision => decision.Id);
            builder.Property(decision => decision.PurchaseRequestId)
                .IsRequired();
            builder.Property(decision => decision.ApproverUserId)
                .IsRequired();
            builder.Property(decision => decision.Decision)
                .IsRequired();
            builder.Property(decision => decision.Comment)
                .HasMaxLength(1000);
            builder.Property(decision => decision.DecidedAt)
                .IsRequired();
            builder.HasOne(decision => decision.PurchaseRequest)
                .WithOne(request => request.ApprovalDecision)
                .HasForeignKey<ApprovalDecision>(decision => decision.PurchaseRequestId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(decision => decision.ApproverUser)
                .WithMany()
                .HasForeignKey(decision => decision.ApproverUserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
