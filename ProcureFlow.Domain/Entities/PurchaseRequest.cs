using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Domain.Entities
{
    public class PurchaseRequest
    {
        public Guid Id { get; private set; }
        public string RequestNumber { get; private set; } = null!;
        public Guid RequestedByUserId { get; private set; }
        public Guid DepartmentId { get; private set; }
        public PurchaseRequestPriority Priority { get; private set; }
        public PurchaseRequestStatus Status { get; private set; }
        public string Justification { get; private set; } = null!;
        public decimal TotalAmount { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? SubmittedAt { get; private set; }
        public DateTime? ApprovedAt { get; private set; }
        public DateTime? RejectedAt { get; private set; }
        public DateTime? CancelledAt { get; private set; }
        
        public User RequestedByUser { get; private set; } = null!;
        public Department Department { get; private set; } = null!;
        public ICollection<PurchaseRequestItem> Items { get; private set; } = new List<PurchaseRequestItem>();
        public ApprovalDecision? ApprovalDecision { get; private set; }
        private PurchaseRequest() { }
        public PurchaseRequest(string requestNumber, Guid requestedByUserId, Guid departmentId, PurchaseRequestPriority priority, string justification, decimal totalAmount)
        {
            Validate(requestNumber, requestedByUserId, departmentId, priority, justification, totalAmount);
            Id = Guid.NewGuid();
            RequestNumber = requestNumber;
            RequestedByUserId = requestedByUserId;
            DepartmentId = departmentId;
            Priority = priority;
            Status = PurchaseRequestStatus.Draft;
            Justification = justification;
            TotalAmount = totalAmount;
            CreatedAt = DateTime.UtcNow;
        }
        public void Update(string requestNumber, Guid departmentId, PurchaseRequestPriority priority, string justification, decimal totalAmount)
        {
            Validate(requestNumber, RequestedByUserId, departmentId, priority, justification, totalAmount);
            RequestNumber = requestNumber;
            DepartmentId = departmentId;
            Priority = priority;
            Justification = justification;
            TotalAmount = totalAmount;
        }
        public void Submit()
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden enviar solicitudes en estado borrador.");
            Status = PurchaseRequestStatus.Submitted;
            SubmittedAt = DateTime.UtcNow;
        }
        public void Reject()
        {
            if (Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden rechazar solicitudes en estado enviado.");
            Status = PurchaseRequestStatus.Rejected;
            RejectedAt = DateTime.UtcNow;
        }
        public void Approve()
        {
            if (Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden aprobar solicitudes en estado enviado.");
            Status = PurchaseRequestStatus.Approved;
            ApprovedAt = DateTime.UtcNow;
        }
        public void Cancel()
        {
            if (Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden cancelar solicitudes en estado enviado.");
            Status = PurchaseRequestStatus.Cancelled;
            CancelledAt = DateTime.UtcNow;
        }
        
        private void Validate(string requestNumber, Guid requestedByUserId, Guid departmentId, PurchaseRequestPriority priority, string justification, decimal totalAmount)
        {

            if (string.IsNullOrWhiteSpace(requestNumber)) throw new DomainException("El número de solicitud es obligatorio.");
            else if (requestNumber.Length > 50)
                throw new DomainException("El número de solicitud no puede superar los 50 caracteres.");

            if (requestedByUserId == Guid.Empty)
                throw new DomainException("El identificador del usuario solicitante es inválido.");

            if (departmentId == Guid.Empty)
                throw new DomainException("El identificador del departamento es inválido.");

            if (!Enum.IsDefined(typeof(PurchaseRequestPriority), Priority))
                throw new DomainException("La prioridad de la solicitud es inválida.");

            if (string.IsNullOrWhiteSpace(justification))
                throw new DomainException("La justificación es obligatoria.");
            else if (justification.Length > 1000)
                throw new DomainException("La justificación no puede superar los 1000 caracteres.");

            if (totalAmount <= 0m)
                throw new DomainException("El monto total debe ser mayor que cero.");
            else if (totalAmount > 1_000_000_000m)
                throw new DomainException("El monto total excede el límite permitido.");
        }
    }
}
