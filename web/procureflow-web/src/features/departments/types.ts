// Copia ProcureFlow.Application/Departments/Dtos/DepartmentDto.cs
export interface Department {
  id: string
  name: string
  isActive: boolean
}

// Copia CreateDepartmentRequest.cs y UpdateDepartmentRequest.cs
export interface DepartmentNameRequest {
  name: string
}

export type DepartmentStatusFilter = 'all' | 'active' | 'inactive'
