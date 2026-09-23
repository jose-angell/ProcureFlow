using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.PurchaseRequests
{
    public class PurchaseRequestUseCase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PurchaseRequestUseCase(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }
        public async Task<PurchaseRequestDto> Create(CreatePurchaseRequestRequest request)
        {

            var currentRole = _currentUserService.Role;
            if(currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para crear solicitudes de compra.");
            }


            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new NotFoundException("Usuario no encontrado.");
            if (!user.IsActive) throw new ConflictException("Usuario inactivo no puede crear solicitudes de compra.");

            var userDepartment = await _context.Departments.FirstOrDefaultAsync(d => d.Id == user.DepartmentId);
            if (userDepartment == null) throw new NotFoundException("Departamento no encontrado.");
            if (!userDepartment.IsActive) throw new ConflictException("Departamento inactivo no puede crear solicitudes de compra.");

            var priority = request.Priority ?? PurchaseRequestPriority.Low;
            var requestNumber = GenerateRequestNumber();
            var newPurchaseRequest = new PurchaseRequest(
                requestNumber,
                user.Id,
                user.DepartmentId,
                priority,
                request.Justification!
            );

            await _context.PurchaseRequests.AddAsync(newPurchaseRequest);
            await _context.SaveChangesAsync();

            return new PurchaseRequestDto
            {
                Id = newPurchaseRequest.Id,
                RequestNumber = newPurchaseRequest.RequestNumber,
                RequestedByUserId = newPurchaseRequest.RequestedByUserId,
                DepartmentId = newPurchaseRequest.DepartmentId,
                Priority = newPurchaseRequest.Priority,
                Status = newPurchaseRequest.Status,
                Justification = newPurchaseRequest.Justification,
                TotalAmount = newPurchaseRequest.TotalAmount,
                CreatedAt = newPurchaseRequest.CreatedAt,
                SubmittedAt = newPurchaseRequest.SubmittedAt,
                ApprovedAt = newPurchaseRequest.ApprovedAt,
                RejectedAt = newPurchaseRequest.RejectedAt,
                CancelledAt = newPurchaseRequest.CancelledAt
            };
        }
        private string GenerateRequestNumber()
        {
            string guidPart = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

            int year = DateTime.Now.Year;

            return $"PR-{year}-{guidPart}";
        }
    }
}
