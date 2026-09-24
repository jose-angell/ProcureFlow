using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Departments.Dtos;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;

namespace ProcureFlow.Application.Departments
{
    public class DepartmentUseCase
    {
        private readonly IApplicationDbContext _context;
        public DepartmentUseCase(IApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<DepartmentDto> Create(CreateDepartmentRequest request)
        {
            var existingDepartment = await _context.Departments.AnyAsync(d => d.Name == request.Name);
            if (existingDepartment) throw new ConflictException("El departamento ya existe.");
            var department = new Department(request.Name!);

            await _context.Departments.AddAsync(department);
            await _context.SaveChangesAsync();
            return new DepartmentDto
            {
                Id = department.Id,
                Name = department.Name,
                IsActive = department.IsActive
            };
        }
        public async Task Update(Guid id, UpdateDepartmentRequest request)
        {
            var department = await _context.Departments.FindAsync(id);
            if (department == null) throw new NotFoundException("El departamento no existe.");

            var existingDepartment = await _context.Departments.AnyAsync(d => d.Id != id && d.Name == request.Name);
            if (existingDepartment) throw new ConflictException("El departamento ya existe.");

            department.UpdateName(request.Name!);
            await _context.SaveChangesAsync();
        }
        public async Task Delete(Guid id)
        {
            var department = await _context.Departments.FindAsync(id);
            if (department == null) throw new NotFoundException("El departamento no existe.");
            var hasUsers = await _context.Users.AnyAsync(u => u.DepartmentId == id);
            if (hasUsers) throw new ConflictException("No se puede eliminar un departamento con usuarios asociados.");
            _context.Departments.Remove(department);
            await _context.SaveChangesAsync();
        }
        public async Task Activate(Guid id)
        {
            var department = await _context.Departments.FindAsync(id);
            if (department == null) throw new NotFoundException("El departamento no existe.");
            department.Activate();
            await _context.SaveChangesAsync();
        }
        public async Task Deactivate(Guid id)
        {
            var department = await _context.Departments.FindAsync(id);
            if (department == null) throw new NotFoundException("El departamento no existe.");
            var hasUsers = await _context.Users.AnyAsync(u => u.DepartmentId == id);
            if (hasUsers) throw new ConflictException("No se puede desactivar un departamento con usuarios asociados.");
            department.Deactivate();
            await _context.SaveChangesAsync();
        }
        public async Task<ICollection<DepartmentDto>> GetAll()
        {
            return await _context.Departments.AsNoTracking().
                Select(d => new DepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    IsActive = d.IsActive
                })
                .ToListAsync();
        }
        public async Task<DepartmentDto> GetById(Guid id)
        {
            var department = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
            if (department == null) throw new NotFoundException("El departamento no existe.");
            return new DepartmentDto
            {
                Id = department.Id,
                Name = department.Name,
                IsActive = department.IsActive
            };
        }
    }
}
