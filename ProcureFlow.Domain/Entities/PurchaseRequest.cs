using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;

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
        private readonly List<PurchaseRequestItem> _items = new();
        public IReadOnlyCollection<PurchaseRequestItem> Items => _items;
        public ApprovalDecision? ApprovalDecision { get; private set; }
        private PurchaseRequest() { }
        public PurchaseRequest(string requestNumber, Guid requestedByUserId, Guid departmentId, PurchaseRequestPriority priority, string justification)
        {
            Validate(requestNumber, requestedByUserId, departmentId, priority, justification);
            Id = Guid.NewGuid();
            RequestNumber = requestNumber;
            RequestedByUserId = requestedByUserId;
            DepartmentId = departmentId;
            Priority = priority;
            Status = PurchaseRequestStatus.Draft;
            Justification = justification;
            TotalAmount = 0m;
            CreatedAt = DateTime.UtcNow;
        }
        public void Update(PurchaseRequestPriority priority, string justification)
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden actualizar solicitudes en estado borrador.");

            Validate(RequestNumber, RequestedByUserId, DepartmentId, priority, justification);
            Priority = priority;
            Justification = justification;
            TotalAmount = Items.Sum(i => i.Quantity * i.UnitPrice);
        }
        public PurchaseRequestItem AddItem(string description, int quantity, decimal unitPrice)
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden agregar items a solicitudes en estado borrador.");
            var item = new PurchaseRequestItem(Id, description, quantity, unitPrice);
            _items.Add(item);
            RecalculateTotal();
            return item;
        }
        public void RemoveItem(Guid itemId)
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden eliminar items de solicitudes en estado borrador.");
            var item = _items.FirstOrDefault(i => i.Id == itemId);
            if (item == null)
                throw new DomainException("El item no existe en la solicitud.");
            _items.Remove(item);
            RecalculateTotal();
        }
        public void UpdateItem(Guid itemId, string description, int quantity, decimal estimatedUnitPrice)
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden actualizar items de solicitudes en estado borrador.");
            var item = _items.FirstOrDefault(i => i.Id == itemId);
            if (item == null)
                throw new DomainException("El item no existe en la solicitud.");
            item.Update(description, quantity, estimatedUnitPrice);
            RecalculateTotal();
        }
        public void Submit()
        {
            if (Status != PurchaseRequestStatus.Draft)
                throw new DomainException("Solo se pueden enviar solicitudes en estado borrador.");
            if (!Items.Any())
                throw new DomainException("No se puede enviar una solicitud sin items.");
            if (TotalAmount <= 0)
                throw new DomainException("No se puede enviar una solicitud con monto total menor o igual a cero.");
            Status = PurchaseRequestStatus.Submitted;
            SubmittedAt = DateTime.UtcNow;
        }
        public void Reject(Guid approverUserId, string comment)
        {
            if (Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden rechazar solicitudes en estado enviado.");
            if (string.IsNullOrWhiteSpace(comment))
                throw new DomainException("El comentario es obligatorio para rechazar la solicitud.");

            var decision = new ApprovalDecision(Id, approverUserId, ApprovalDecisionType.Rejected, comment);
            Status = PurchaseRequestStatus.Rejected;
            RejectedAt = DateTime.UtcNow;
            ApprovalDecision = decision;
        }
        public void Approve(Guid approverUserId, string? comment)
        {
            if (Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden aprobar solicitudes en estado enviado.");

            var decision = new ApprovalDecision(Id, approverUserId, ApprovalDecisionType.Approved, comment);
            Status = PurchaseRequestStatus.Approved;
            ApprovedAt = DateTime.UtcNow;
            ApprovalDecision = decision;
        }
        public void Cancel()
        {
            if (Status != PurchaseRequestStatus.Draft && Status != PurchaseRequestStatus.Submitted)
                throw new DomainException("Solo se pueden cancelar solicitudes en estado borrador o enviado.");
            Status = PurchaseRequestStatus.Cancelled;
            CancelledAt = DateTime.UtcNow;
        }

        private void Validate(string requestNumber, Guid requestedByUserId, Guid departmentId, PurchaseRequestPriority priority, string justification)
        {

            if (string.IsNullOrWhiteSpace(requestNumber)) throw new DomainException("El número de solicitud es obligatorio.");
            else if (requestNumber.Length > 30)
                throw new DomainException("El número de solicitud no puede superar los 30 caracteres.");

            if (requestedByUserId == Guid.Empty)
                throw new DomainException("El identificador del usuario solicitante es inválido.");

            if (departmentId == Guid.Empty)
                throw new DomainException("El identificador del departamento es inválido.");

            if (!Enum.IsDefined(typeof(PurchaseRequestPriority), priority))
                throw new DomainException("La prioridad de la solicitud es inválida.");

            if (string.IsNullOrWhiteSpace(justification))
                throw new DomainException("La justificación es obligatoria.");
            else if (justification.Length > 1000)
                throw new DomainException("La justificación no puede superar los 1000 caracteres.");

        }
        private void RecalculateTotal()
        {
            TotalAmount = Items.Sum(i => i.Quantity * i.UnitPrice);
        }
    }
}
