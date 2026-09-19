using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Domain.Entities
{
    public class User
    {
        public Guid Id { get; private set; }
        public string FullName { get; private set; } = null!;
        public string Email { get; private set; } = null!;
        public string PasswordHash { get; private set; } = null!;
        public UserRole Role { get; private set; }
        public Guid DepartmentId { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }

        public Department Department { get; private set; } = null!;

        private User() { }

        public User(string fullName, string email, string passwordHash, UserRole role, Guid departmentId)
        {
            Validate(fullName, email, passwordHash, role, departmentId);
            Id = Guid.NewGuid();
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
            Role = role;
            DepartmentId = departmentId;
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
        }
        public void Update(string fullName, string email, string passwordHash, UserRole role, Guid departmentId)
        {
            Validate(fullName, email, passwordHash, role, departmentId);
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
            Role = role;
            DepartmentId = departmentId;
        }
        public void Activate()
        {
            IsActive = true;
        }
        public void Deactivate()
        {
            IsActive = false;
        }
        public void ChangeDepartment(Guid departmentId)
        {
            if (departmentId == Guid.Empty) throw new DomainException("El id del departamento no puede ser vacio.");
            DepartmentId = departmentId;
        }
        private void Validate(string fullName, string email, string passwordHash, UserRole role, Guid departmentId)
        {
            if (String.IsNullOrWhiteSpace(fullName)) throw new DomainException("El nombre no puede ser null o estar vacio.");
            if (String.IsNullOrWhiteSpace(email)) throw new DomainException("El correo no puede ser null o estar vacio.");
            if (String.IsNullOrWhiteSpace(passwordHash)) throw new DomainException("La contraseña no puede ser null o estar vacia.");
            if (!Enum.IsDefined(typeof(UserRole), role)) throw new DomainException("El role no es valido.");
            if (departmentId == Guid.Empty) throw new DomainException("El id del departamento no puede ser vacio.");
        }
    }
}
