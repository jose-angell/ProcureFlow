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
            {
                throw new DomainException("Department name cannot be null or empty.");
            }
            Id = Guid.NewGuid();
            Name = name;
            IsActive = true;
        }
        public void UpdateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new DomainException("Department name cannot be null or empty.");
            }
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
