using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Common;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;

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
            var isAuthenticated = _currentUserService.IsAuthenticated;
            if(!isAuthenticated)
            {
                throw new UnauthorizedException("Usuario no autenticado.");
            }

            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedException("Usuario no autorizado para crear solicitudes de compra.");
            }


            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new ForbiddenException("Usuario no encontrado.");
            if (!user.IsActive) throw new ConflictException("Usuario inactivo no puede crear solicitudes de compra.");

            var userDepartment = await _context.Departments.FirstOrDefaultAsync(d => d.Id == user.DepartmentId);
            if (userDepartment == null) throw new NotFoundException("Departamento no encontrado.");
            if (!userDepartment.IsActive) throw new ConflictException("Departamento inactivo no puede crear solicitudes de compra.");

            var priority = request.Priority ?? PurchaseRequestPriority.Low;
            var newPurchaseRequest = new PurchaseRequest(
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
                throw new UnauthorizedException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new UnauthorizedException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }

            purchaseRequest.Update(request.Priority!.Value, request.Justification!);
            await _context.SaveChangesAsync();
        }
        public async Task<PurchaseRequestItemDto> GetItemById(Guid id)
        {
            var result = await _context.PurchaseRequestItems.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (result == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            return new PurchaseRequestItemDto
            {
                Id = result!.Id,
                PurchaseRequestId = result.PurchaseRequestId,
                Description = result.Description,
                Quantity = result.Quantity,
                UnitPrice = result.UnitPrice
            };
        }
        public async Task<PurchaseRequestItemDto> AddItem(Guid id, CreatePurchaseRequestItemRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new ForbiddenException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }

            var newItem = purchaseRequest.AddItem(request.Description!, request.Quantity!.Value, request.UnitPrice!.Value);
            await _context.SaveChangesAsync();
            return new PurchaseRequestItemDto
            {
                Id = newItem.Id,
                PurchaseRequestId = newItem.PurchaseRequestId,
                Description = newItem.Description,
                Quantity = newItem.Quantity,
                UnitPrice = newItem.UnitPrice
            };
        }
        public async Task UpdateItem(Guid id, Guid itemId, UpdatePurchaseRequestItemRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new ForbiddenException("Usuario no autorizado para actualizar esta solicitud de compra.");
            }


            purchaseRequest.UpdateItem(itemId, request.Description!, request.Quantity!.Value, request.UnitPrice!.Value);

            await _context.SaveChangesAsync();
        }
        public async Task DeleteItem(Guid id, Guid itemId)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedException("Usuario no autorizado para actualizar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new ForbiddenException("Usuario no autorizado para actualizar esta solicitud de compra.");
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
                throw new UnauthorizedException("Usuario no autorizado para enviar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new ForbiddenException("Usuario no autorizado para enviar esta solicitud de compra.");
            }

            purchaseRequest.Submit();
            await _context.SaveChangesAsync();
        }
        public async Task Cancel(Guid id)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Requester)
            {
                throw new UnauthorizedException("Usuario no autorizado para enviar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");
            if (purchaseRequest.RequestedByUserId != currentUserId && currentRole != UserRole.Admin)
            {
                throw new ForbiddenException("Usuario no autorizado para enviar esta solicitud de compra.");
            }
            purchaseRequest.Cancel();
            await _context.SaveChangesAsync();
        }
        public async Task Approve(Guid id, DecisionRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Approver)
            {
                throw new ForbiddenException("Usuario no autorizado para aprovar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new ForbiddenException("Usuario no encontrado.");
            if (!user.IsActive) throw new ConflictException("Usuario inactivo no puede aprovarsolicitudes de compra.");
            
            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");

            if (currentRole != UserRole.Admin && user.DepartmentId != purchaseRequest.DepartmentId)
                throw new ForbiddenException("Usuario no autorizado para aprovar esta solicitud de compra.");

            purchaseRequest.Approve(currentUserId, request.Comments);
            await _context.SaveChangesAsync();
        }
        public async Task Reject(Guid id, DecisionRequest request)
        {
            var currentRole = _currentUserService.Role;
            if (currentRole != UserRole.Admin && currentRole != UserRole.Approver)
            {
                throw new UnauthorizedException("Usuario no autorizado para rechazar solicitudes de compra.");
            }
            var currentUserId = _currentUserService.UserId;

            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new ForbiddenException("Usuario no encontrado.");
            if (!user.IsActive) throw new ConflictException("Usuario inactivo no puede aprovarsolicitudes de compra.");

            var purchaseRequest = await _context.PurchaseRequests.FindAsync(id);
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");

            if (currentRole != UserRole.Admin && user.DepartmentId != purchaseRequest.DepartmentId)
                throw new ForbiddenException("Usuario no autorizado para aprovar esta solicitud de compra.");

            purchaseRequest.Reject(currentUserId, request.Comments!);
            await _context.SaveChangesAsync();
        }
        public async Task<PurchaseRequestDetailDto> GetById(Guid id)
        {
            var currentRole = _currentUserService.Role;
            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) throw new NotFoundException("El usuario no fue encotrado");


            IQueryable<PurchaseRequest> query = _context.PurchaseRequests
               .Include(pr => pr.Items)
               .Include(pr => pr.RequestedByUser)
               .Include(pr => pr.Department)
               .Include(pr => pr.ApprovalDecision)
                   .ThenInclude(d => d!.ApproverUser);

            if(currentRole == UserRole.Approver)
            {
                query = query.Where(pr => pr.DepartmentId == user.DepartmentId);
            }
            if(currentRole == UserRole.Requester)
            {
                query = query.Where(pr => pr.RequestedByUserId == user.Id);
            }

            var purchaseRequest = await query.FirstOrDefaultAsync(pr => pr.Id == id); 
            if (purchaseRequest == null) throw new NotFoundException("Solicitud de compra no encontrada.");


            return new PurchaseRequestDetailDto
            {
                Id = purchaseRequest.Id,
                RequestNumber = purchaseRequest.RequestNumber,
                RequestedByUserId = purchaseRequest.RequestedByUserId,
                RequestedByName = purchaseRequest.RequestedByUser.FullName,
                DepartmentId = purchaseRequest.DepartmentId,
                DepartmentName = purchaseRequest.Department.Name,
                Priority = purchaseRequest.Priority,
                Status = purchaseRequest.Status,
                Justification = purchaseRequest.Justification,
                TotalAmount = purchaseRequest.TotalAmount,
                CreatedAt = purchaseRequest.CreatedAt,
                SubmittedAt = purchaseRequest.SubmittedAt,
                ApprovedAt = purchaseRequest.ApprovedAt,
                RejectedAt = purchaseRequest.RejectedAt,
                CancelledAt = purchaseRequest.CancelledAt,
                ItemsCount = purchaseRequest.Items.Count,
                DecidedAt = purchaseRequest.ApprovalDecision?.DecidedAt,
                DecisionComment = purchaseRequest.ApprovalDecision?.Comment,
                DecidedByName = purchaseRequest.ApprovalDecision?.ApproverUser.FullName,
                Items =purchaseRequest.Items.Select(i => new PurchaseRequestItemDto
                {
                    Id = i.Id,
                    PurchaseRequestId = i.PurchaseRequestId,
                    Description = i.Description,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice
                }).ToList()
            };
        }
        public async Task<PagedResult<PurchaseRequestDto>> GetAll(PurchaseRequestQuery query)
        {

            var currentRole = _currentUserService.Role;
            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null) throw new NotFoundException("El usuario no fue encotrado");

            var purchaseRequestsQuery = _context.PurchaseRequests.Include(pr => pr.Items).AsQueryable();

            if (currentRole == UserRole.Approver)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.DepartmentId == user.DepartmentId);
            }
            if (currentRole == UserRole.Requester)
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
            if (!string.IsNullOrEmpty(query.Priority))
            {
                if (!Enum.TryParse<PurchaseRequestPriority>(query.Priority, true, out var priority)
                    || !Enum.IsDefined(priority))
                {
                    throw new DomainException("La prioridad no es válida.");
                }
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.Priority == priority);
            }
            if (query.DecidedByMe)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr =>
                    pr.ApprovalDecision != null && pr.ApprovalDecision.ApproverUserId == currentUserId);
            }
            if (query.DepartmentId.HasValue)
            {
                purchaseRequestsQuery = purchaseRequestsQuery.Where(pr => pr.DepartmentId == query.DepartmentId.Value);
            }
            var totalCount = await purchaseRequestsQuery.CountAsync();
            var skip = (query.Page - 1) * query.PageSize;
            var take = query.PageSize;
            var purchaseRequests = await purchaseRequestsQuery
                .OrderByDescending(pr => pr.CreatedAt)
                .Select(pr => new PurchaseRequestDto
                {
                    Id = pr.Id,
                    RequestNumber = pr.RequestNumber,
                    RequestedByUserId = pr.RequestedByUserId,
                    RequestedByName = pr.RequestedByUser.FullName,
                    DepartmentId = pr.DepartmentId,
                    DepartmentName = pr.Department.Name,
                    Priority = pr.Priority,
                    Status = pr.Status,
                    Justification = pr.Justification,
                    TotalAmount = pr.TotalAmount,
                    CreatedAt = pr.CreatedAt,
                    SubmittedAt = pr.SubmittedAt,
                    ApprovedAt = pr.ApprovedAt,
                    RejectedAt = pr.RejectedAt,
                    CancelledAt = pr.CancelledAt,
                    ItemsCount = pr.Items.Count,
                    DecidedAt = pr.ApprovalDecision != null ? pr.ApprovalDecision.DecidedAt : null,
                    DecisionComment = pr.ApprovalDecision != null ? pr.ApprovalDecision.Comment : null,
                    DecidedByName = pr.ApprovalDecision != null ? pr.ApprovalDecision.ApproverUser.FullName : null
                })
                .Skip(skip)
                .Take(take)
                .ToListAsync();
            return new PagedResult<PurchaseRequestDto>
            {
                Items = purchaseRequests,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }
        public async Task<PurchaseRequestSummaryDto> GetSummary()
        {
            var currentRole = _currentUserService.Role;
            var currentUserId = _currentUserService.UserId;
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) throw new NotFoundException("Usuario no encontrado.");

            IQueryable<PurchaseRequest> query = _context.PurchaseRequests.AsNoTracking();
            if (currentRole == UserRole.Approver)
            {
                query = query.Where(pr => pr.DepartmentId == user.DepartmentId);
            }
            if (currentRole == UserRole.Requester)
            {
                query = query.Where(pr => pr.RequestedByUserId == user.Id);
            }

            var statusCounts = await query
                .GroupBy(pr => pr.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var byDepartment = await query
                .GroupBy(pr => new { pr.DepartmentId, pr.Department.Name })
                .Select(g => new DepartmentRequestCountDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.Name,
                    Count = g.Count()
                })
                .ToListAsync();

            // La suma se hace en memoria: SQLite no traduce Sum sobre decimal.
            var amounts = await query.Select(pr => pr.TotalAmount).ToListAsync();

            int CountOf(PurchaseRequestStatus status) =>
                statusCounts.FirstOrDefault(s => s.Status == status)?.Count ?? 0;

            return new PurchaseRequestSummaryDto
            {
                Total = statusCounts.Sum(s => s.Count),
                Draft = CountOf(PurchaseRequestStatus.Draft),
                Submitted = CountOf(PurchaseRequestStatus.Submitted),
                Approved = CountOf(PurchaseRequestStatus.Approved),
                Rejected = CountOf(PurchaseRequestStatus.Rejected),
                Cancelled = CountOf(PurchaseRequestStatus.Cancelled),
                TotalAmount = amounts.Sum(),
                ByDepartment = byDepartment.OrderByDescending(d => d.Count).ToList()
            };
        }
        public async Task<ICollection<PurchaseRequestDto>> GetPendingApprovals()
        {
            var currentRole = _currentUserService.Role;
            var currentUser = _currentUserService.UserId;
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUser);
            if (user == null) throw new NotFoundException("Usuario no encontrado.");

            IQueryable<PurchaseRequest> query = _context.PurchaseRequests.AsNoTracking()
                .Where(p => p.Status == PurchaseRequestStatus.Submitted);
            if (currentRole == UserRole.Requester)
            {
                query = query.Where(p => p.RequestedByUserId == user.Id);
            }

            if (currentRole == UserRole.Approver)
            {
                query = query.Where(p => p.DepartmentId == user.DepartmentId);
            }

            return await query.Select(pr => new PurchaseRequestDto
            {
                Id = pr.Id,
                RequestNumber = pr.RequestNumber,
                RequestedByUserId = pr.RequestedByUserId,
                RequestedByName = pr.RequestedByUser.FullName,
                DepartmentId = pr.DepartmentId,
                DepartmentName = pr.Department.Name,
                Priority = pr.Priority,
                Status = pr.Status,
                Justification = pr.Justification,
                TotalAmount = pr.TotalAmount,
                CreatedAt = pr.CreatedAt,
                SubmittedAt = pr.SubmittedAt,
                ApprovedAt = pr.ApprovedAt,
                RejectedAt = pr.RejectedAt,
                CancelledAt = pr.CancelledAt
            }).ToListAsync();
        }

    }
}
