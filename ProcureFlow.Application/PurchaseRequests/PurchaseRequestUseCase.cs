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
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
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
        public async Task Update(Guid id, UpdatePurchaseRequestRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if(purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if(purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }

            purchaseRequest.Update(request.Priority!.Value, request.Justification!);
            await _context.SaveChangesAsync();
        }
        public async Task AddItem(Guid id, CreatePurchaseRequestItemRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }

            purchaseRequest.AddItem(request.Description!, request.Quantity!.Value, request.UnitPrice!.Value);
            await _context.SaveChangesAsync();
        }
        public async Task UpdateItem(Guid id, UpdatePurchaseRequestItemRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }
            var item = purchaseRequest.Items.FirstOrDefault(i => i.Id == request.ItemId);
            if (item == null) throw new NotFoundException("Item de solicitud de compra no encontrado.");

            item.Update(request.Description!, request.Quantity!.Value, request.UnitPrice!.Value);

            await _context.SaveChangesAsync();
        }
        public async Task DeleteItem(Guid id, Guid itemId)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }
            var item = purchaseRequest.Items.FirstOrDefault(i => i.Id == itemId);
            if (item == null) throw new NotFoundException("Item de solicitud de compra no encontrado.");
            
            purchaseRequest.RemoveItem(itemId);
            await _context.SaveChangesAsync();
        }
        public async Task Submit(Guid id)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para enviar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para enviar esta solicitud de compra.");
            }
            purchaseRequest.Submit();
            await _context.SaveChangesAsync();
        }
        public async Task Cancel(Guid id)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para enviar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para enviar esta solicitud de compra.");
            }
            purchaseRequest.Cancel();
            await _context.SaveChangesAsync();
        }
        public async Task Approve(Guid id, DecisionRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Approver)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para aprovar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            
            purchaseRequest.Approve(currentUserId, request.Comments);
            await _context.SaveChangesAsync();
        }
        public async Task Reject(Guid id, DecisionRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Approver)
            {
                throw new UnauthorizedAccessException("Usuario no autorizado para rechazar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");

            purchaseRequest.Reject(currentUserId, request.Comments!);
            await _context.SaveChangesAsync();
        }
        public async Task<PurchaseRequestDto> GetById(Guid id)
        {
            var purchaseRequest = await _context.PurchaseRequests
                .Include(pr => pr.Items)
                .FirstOrDefaultAsync(pr => pr.Id == id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            return new PurchaseRequestDto
            {
                Id = purchaseRequest.Id,
                RequestNumber = purchaseRequest.RequestNumber,
                RequestedByUserId = purchaseRequest.RequestedByUserId,
                DepartmentId = purchaseRequest.DepartmentId,
                Priority = purchaseRequest.Priority,
                Status = purchaseRequest.Status,
                Justification = purchaseRequest.Justification,
                TotalAmount = purchaseRequest.TotalAmount,
                CreatedAt = purchaseRequest.CreatedAt,
                SubmittedAt = purchaseRequest.SubmittedAt,
                ApprovedAt = purchaseRequest.ApprovedAt,
                RejectedAt = purchaseRequest.RejectedAt,
                CancelledAt = purchaseRequest.CancelledAt
            };
        }
        public async Task<IEnumerable<PurchaseRequestDto>> GetAll(PurchaseRequestQuery query)
        {

            var currentRole = _currentUserService.Role;
            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new NotFoundException("El usuario no fue encotrado");

            var purchaseRequestsQuery = _context.PurchaseRequests.AsQueryable();
            
            if(currentRole == UserRole.Approver)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.DepartmentId == user.DepartmentId);
            }
            if(currentRole == UserRole.Requester)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.RequestedByUserId == user.Id);
            }
            
            if (!string.IsNullOrEmpty(query.RequestNumber))
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.RequestNumber.Contains(query.RequestNumber));
            }
            if (!string.IsNullOrEmpty(query.Department))
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.Department.Name.Contains(query.Department));
            }
            if (query.CreatedDateFrom.HasValue)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.CreatedAt >= query.CreatedDateFrom.Value);
            }
            if (query.CreatedDateTo.HasValue)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.CreatedAt <= query.CreatedDateTo.Value);
            }
            if (!string.IsNullOrEmpty(query.Status))
            {
                var status = Enum.Parse<PurchaseRequestStatus>(query.Status, true);
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.Status == status);
            }
            var skip = (query.Page - 1) * query.PageSize;
            var take = query.PageSize;
            var purchaseRequests = await purchaseRequestsQuery
                .Select(pr => new PurchaseRequestDto
                {
                    Id = pr.Id,
                    RequestNumber = pr.RequestNumber,
                    RequestedByUserId = pr.RequestedByUserId,
                    DepartmentId = pr.DepartmentId,
                    Priority = pr.Priority,
                    Status = pr.Status,
                    Justification = pr.Justification,
                    TotalAmount = pr.TotalAmount,
                    CreatedAt = pr.CreatedAt,
                    SubmittedAt = pr.SubmittedAt,
                    ApprovedAt = pr.ApprovedAt,
                    RejectedAt = pr.RejectedAt,
                    CancelledAt = pr.CancelledAt
                })
                .Skip(skip)
                .Take(take)
                .ToListAsync();
            return purchaseRequests;
        }
        private string GenerateRequestNumber()
        {
            string guidPart = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

            int year = DateTime.Now.Year;

            return $"PR-{year}-{guidPart}";
        }
    }
}
