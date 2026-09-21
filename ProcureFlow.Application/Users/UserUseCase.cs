using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.Users.Dtos;
using ProcureFlow.Domain.Entities;

namespace ProcureFlow.Application.Users
{
    public class UserUseCase
    {
        private readonly IApplicationDbContext _context;
        private readonly IPasswordHashService _passwordHashService;
        public UserUseCase(IApplicationDbContext context, IPasswordHashService passwordHashService)
        {
            _context = context;
            _passwordHashService = passwordHashService;
        }
        public async Task<UserDto> Create(CreateUserRequest request)
        {
            var existEmail = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (existEmail) throw new ConflictException("El correo no esta disponible.");

            var passwordHash = _passwordHashService.Hash(request.Password!);

            var newUser = new User(request.FullName!, request.Email!, passwordHash, request.Role!.Value, request.DepartmentId!.Value);
            await _context.Users.AddAsync(newUser);
            await _context.SaveChangesAsync();
            return new UserDto
            {
                Id = newUser.Id,
                FullName = newUser.FullName,
                Email = newUser.Email,
                Role = newUser.Role,
                IsActive = newUser.IsActive,
                DepartmentId = newUser.DepartmentId,
                CreatedAt = newUser.CreatedAt,
            };
        }
        public async Task Update(Guid id, UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) throw new NotFoundException("El usuario no esta en el sistema.");

            var existEmail = await _context.Users.AnyAsync(u => u.Id != id && u.Email == request.Email);
            if (existEmail) throw new ConflictException("El correo no esta disponible.");

            var passwordHash = _passwordHashService.Hash(request.Password!);

            user.Update(request.FullName!, request.Email!, passwordHash, request.Role!.Value, request.DepartmentId!.Value);
            await _context.SaveChangesAsync();
        }
        public async Task Delete(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) throw new NotFoundException("El usuario no esta en el sistema.");

            var hasPurchase = await _context.PurchaseRequests.AnyAsync(t => t.RequestedByUserId == id);
            if (hasPurchase) throw new ConflictException("No se puede eliminar un Usuario con solicitudes creadas o asignadas.");

            var hasApprovalDecisions = await _context.ApprovalDecisions.AnyAsync(t => t.ApproverUserId == id);
            if (hasApprovalDecisions) throw new ConflictException("No se puede eliminar un Usuario con decisiones de aprobación.");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }
        public async Task Activate(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) throw new NotFoundException("El usuario no esta en el sistema.");

            user.Activate();
            await _context.SaveChangesAsync();
        }
        public async Task Deactivate(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) throw new NotFoundException("El usuario no esta en el sistema.");

            user.Deactivate();
            await _context.SaveChangesAsync();
        }
        public async Task<UserDto> GetById(Guid id)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) throw new NotFoundException("El usuario no esta en el sistema.");
            return new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                IsActive = user.IsActive,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
            };
        }
        public async Task<IEnumerable<UserDto>> GetAll(UserQuery paramsQuery)
        {
            IQueryable<User> query = _context.Users.AsNoTracking();

            if (!String.IsNullOrWhiteSpace(paramsQuery.name))
            {
                query = query.Where(u => u.FullName.ToLower().Contains(paramsQuery.name.ToLower()));
            }
            if (!String.IsNullOrWhiteSpace(paramsQuery.email))
            {
                query = query.Where(u => u.Email.ToLower().Contains(paramsQuery.email.ToLower()));
            }
            if (paramsQuery.role.HasValue)
            {
                query = query.Where(u => u.Role == paramsQuery.role.Value);
            }
            if (paramsQuery.isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == paramsQuery.isActive.Value);
            }
            if (!String.IsNullOrWhiteSpace(paramsQuery.departmentName))
            {
                query = query.Where(u => u.Department.Name.ToLower().Contains(paramsQuery.departmentName.ToLower()));
            }

            int pageSize = paramsQuery.pageSize;
            int page = paramsQuery.page;
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            return await query.Select(u => new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department.Name,
                CreatedAt = u.CreatedAt,
            })
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
    }
}
