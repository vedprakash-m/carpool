import "reflect-metadata";
import { container as tsyringeContainer, singleton } from "tsyringe";

// Import your services and repositories here
import { AuthService } from "./services/auth.service";
import { UserService } from "./services/user.service";
import { FamilyService } from "./services/family.service";
import { ChildService } from "./services/child.service";
import { PreferenceService } from "./services/preference.service";
import { SchedulingService } from "./services/scheduling.service";
import { UserRepository } from "./repositories/user.repository";
import { FamilyRepository } from "./repositories/family.repository";
import { ChildRepository } from "./repositories/child.repository";
import { createLogger, ILogger } from "./utils/logger";

// Register services and repositories
tsyringeContainer.register<AuthService>("AuthService", {
  useClass: AuthService,
});
tsyringeContainer.register<UserService>("UserService", {
  useClass: UserService,
});
tsyringeContainer.register<FamilyService>("FamilyService", {
  useClass: FamilyService,
});
tsyringeContainer.register<ChildService>("ChildService", {
  useClass: ChildService,
});
tsyringeContainer.register<PreferenceService>("PreferenceService", {
  useClass: PreferenceService,
});
tsyringeContainer.register<SchedulingService>("SchedulingService", {
  useClass: SchedulingService,
});

tsyringeContainer.register<UserRepository>("UserRepository", {
  useClass: UserRepository,
});
tsyringeContainer.register<FamilyRepository>("FamilyRepository", {
  useClass: FamilyRepository,
});
tsyringeContainer.register<ChildRepository>("ChildRepository", {
  useClass: ChildRepository,
});

// Logger registration
const logger = createLogger();
tsyringeContainer.register<ILogger>("ILogger", { useValue: logger });

export const container = tsyringeContainer;
