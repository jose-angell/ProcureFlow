using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.Auth
{
    public class AuthUseCase
    {
        private readonly IApplicationDbContext _context;
        private readonly IPasswordHashService _passwordHashService;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        public AuthUseCase(IApplicationDbContext context, IPasswordHashService passwordHashService, IJwtTokenGenerator jwtTokenGenerator)
        {
            _context = context;
            _passwordHashService = passwordHashService;
            _jwtTokenGenerator = jwtTokenGenerator;
        }
        public async Task<AuthResponse> RegisterCustomer(RegisterCustomerRequest request)
        {
            var existEmail = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (existEmail) throw new ConflictException("El correo no esta disponible.");

            var existDepartment = await _context.Departments.AnyAsync(d => d.Id == request.DepartmentId);
            if (!existDepartment) throw new NotFoundException("El departamento no esta en el sistema.");

            var passwordHash = _passwordHashService.Hash(request.Password!);

            var role = UserRole.Requester;

            var newUser = new User(request.FullName!, request.Email!, passwordHash, role, request.DepartmentId!.Value);
            await _context.Users.AddAsync(newUser);
            await _context.SaveChangesAsync();
            var token = _jwtTokenGenerator.Generate(newUser);

            return new AuthResponse
            {
                AccessToken = token,
                UserId = newUser.Id,
                FullName = newUser.FullName,
                Email = newUser.Email,
                Role = newUser.Role
            };
        }
        public async Task<AuthResponse> Login(LoginCustomerRequest request)
        {
            var user = await _context.Users.Include(u => u.Department)
                .FirstOrDefaultAsync(user => user.Email == request.Email);

            if (user is null)
                throw new UnauthorizedException("Credenciales inválidas.");

            if (!user.IsActive)
                throw new ForbiddenException("El usuario está inactivo.");

            var isValidPassword = _passwordHashService.Verify(
                request.Password!,
                user.PasswordHash);

            if (!isValidPassword)
                throw new UnauthorizedException("Credenciales inválidas.");

            var token = _jwtTokenGenerator.Generate(user);

            return new AuthResponse
            {
                AccessToken = token,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                DepartmentId = user.DepartmentId,
                DepartmentName = user.Department?.Name
            };
        }
    }
}
