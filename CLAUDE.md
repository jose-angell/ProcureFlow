# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ProcureFlow is an ASP.NET Core (.NET 10) REST API for internal purchase requests and their approval workflow. It is a modular monolith using pragmatic Clean Architecture. The solution file is `ProcureFlow.slnx`. User-facing messages, exception texts and the README are in Spanish, so keep new messages in Spanish.

## Commands

```bash
dotnet build                                   # build the whole solution
dotnet run --project ProcureFlow.Api           # run the API
dotnet test                                    # all tests (no Postgres needed: tests use SQLite in-memory)
dotnet test --filter "FullyQualifiedName~PurchaseRequestTests"                 # one class
dotnet test --filter "FullyQualifiedName~PurchaseRequestUseCaseTests.Create_ShouldCreateDraft_ForCurrentRequester"  # one test
docker compose up -d                           # local Postgres 16 (reads DB_NAME/DB_USER/DB_PASSWORD/DB_PORT from .env)
```

EF Core migrations (requires `dotnet tool install --global dotnet-ef`):

```bash
dotnet ef database update --project ProcureFlow.Infrastructure --startup-project ProcureFlow.Api
dotnet ef migrations add <Name> --project ProcureFlow.Infrastructure --startup-project ProcureFlow.Api --output-dir Migrations
```

The existing migrations are in `ProcureFlow.Infrastructure/Migrations`. The README says `Persistence/Migrations`, but the code uses `Migrations`.

Configuration: the connection string is `ConnectionStrings:DefaultConnection` and the JWT settings are the `Jwt` section (`SecretKey`, `Issuer`, `Audience`, `ExpirationMinutes`). Both can be overridden with env vars such as `ConnectionStrings__DefaultConnection` and `Jwt__SecretKey`.

## Architecture

Dependencies point inward: `Api → Application → Domain`, and `Infrastructure → Application`. Each layer has a `DependencyInjection.cs` that provides an extension method: `AddApplication()`, `AddInfrastructure(config)` or `AddApi(config)`. `Program.cs` calls all three.

- **Domain**: entities with private setters, and every state change goes through methods. `PurchaseRequest` is the aggregate root. It owns `PurchaseRequestItem`s and an optional `ApprovalDecision`. It enforces the state machine (`Draft → Submitted → Approved|Rejected`; `Draft|Submitted → Cancelled`), edits allowed only in Draft, `TotalAmount` recomputed from the items, a required comment on reject, and `RequestNumber` generation (`PR-{year}-{8 hex}`). Rule violations throw `DomainException`.
- **Application**: one `*UseCase` class per feature (`PurchaseRequests`, `Users`, `Departments`, `Auth`), registered as scoped. Features have DTOs under `Dtos/`. Use cases work directly against `IApplicationDbContext` (EF `DbSet`s). There is no repository layer, MediatR or AutoMapper, and that is a deliberate choice: don't add them. DTO mapping is written by hand. Use cases also handle **contextual authorization** that roles alone can't express: ownership checks (requester owns the request), approver in the same department, and active user/department. They read the caller from `ICurrentUserService`.
- **Infrastructure**: `AppDbContext` (Npgsql), Fluent API configurations in `Configurations/`, `JwtTokenGenerator`, `PasswordHashService`.
- **Api**: thin controllers under `api/auth`, `api/departments`, `api/users` and `api/purchases`. They apply role checks with `[Authorize(Roles = "...")]` and delegate to the use cases. `CurrentUserService` reads the JWT claims (`NameIdentifier`, `Role`).

**Error handling**: controllers do not catch exceptions. Use cases throw typed exceptions, and `GlobalExceptionHandler` maps them to ProblemDetails:
`UnauthorizedException→401`, `ForbiddenException→403`, `NotFoundException→404`, `ConflictException→409`, `DomainException→400`, anything else→500. Pick the exception type that matches the HTTP status you want.

Roles (`UserRole`): `Requester`, `Approver`, `Admin`.

## Frontend ↔ API

The React client lives in `web/procureflow-web` (it has its own `CLAUDE.md`). Permanent conventions:

- CORS is the `"Frontend"` policy, driven by `Cors:AllowedOrigins` (empty in `appsettings.json`, `http://localhost:5173` in Development; override with `Cors__AllowedOrigins__0`). `UseCors` goes before `UseAuthentication`.
- The frontend maps HTTP status codes (400/401/403) to fixed messages, so changing the exception type a use case throws changes what the user sees.
- `UserRole` is numeric in JSON (no `JsonStringEnumConverter`); the frontend copy must match `Domain/Enums/UserRole.cs`.
- Session storage of the JWT in Web Storage is an MVP decision, not a final one.

Rationale and pending items (route guard, logout, expiry, `Authorization` header): `docs/decisions/ADR-001-auth-api.md`. New architectural decisions go in `docs/decisions/`.

## Tests (`ProcureFlow.Tests`, xUnit)

- `Domain/`: plain unit tests on entities, with no infrastructure.
- `Application/`: build a use case directly. Use `TestSupport/TestDbContextFactory` (a SQLite in-memory `AppDbContext` created with `EnsureCreated`) and `FakeCurrentUserService` to simulate the caller. Seed data in one context, then act in a fresh context.
- `Integration/`: `ProcureFlowWebApplicationFactory` (`WebApplicationFactory<Program>`, environment `Testing`) swaps Npgsql for a shared SQLite in-memory connection. `IntegrationTestBase` resets the DB before each test and provides `LoginAsync` and `Authenticate(token)`. `TestDataSeeder` seeds users and departments.

The schema comes from `EnsureCreated` against SQLite, not from migrations. Model configurations therefore have to work on both Postgres and SQLite.
