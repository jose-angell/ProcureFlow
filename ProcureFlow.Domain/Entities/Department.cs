using ProcureFlow.Domain.Exceptions;

namespace ProcureFlow.Domain.Entities
{
    public class Department
    {
        public Guid Id { get; private set; }
        public string Name { get; private set; } = null!;
        public bool IsActive { get; private set; }

        private Department() { }

        public Department(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("El nombre del departamento no puede estar vacío.");
            else if(name.Length > 100)
                throw new DomainException("El nombre del departamento no puede exceder 100 caracteres.");

            Id = Guid.NewGuid();
            Name = name;
            IsActive = true;
        }
        public void UpdateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("El nombre del departamento no puede estar vacío.");
            else if(name.Length > 100)
                throw new DomainException("El nombre del departamento no puede exceder 100 caracteres.");

            Name = name;
        }
        public void Activate()
        {
            IsActive = true;
        }
        public void Deactivate()
        {
            IsActive = false;
        }
    }
}
