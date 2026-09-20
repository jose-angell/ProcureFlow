using System;
using System.Collections.Generic;
using System.Text;

namespace ProcureFlow.Application.Abstractions.Security
{
    public interface IPasswordHashService
    {
        string Hash(string password);
        bool Verify(string password, string passwordHash);
    }
}
