import "reflect-metadata";
import { container as tsyringeContainer, DependencyContainer } from "tsyringe";

// Import your services and repositories here
import { AuthService } from "./services/auth.service";
import { UserService } from "./services/user.service";
import { TripService } from "./services/trip.service";
import { FamilyService } from "./services/family.service";
import { ChildService } from "./services/child.service";
import { PreferenceService } from "./services/preference.service";
import { SchedulingService } from "./services/scheduling.service";
import { UserRepository } from "./repositories/user.repository";
import { FamilyRepository } from "./repositories/family.repository";
import { ChildRepository } from "./repositories/child.repository";
import { AzureLogger, ILogger } from "./utils/logger";

export interface ServiceContainer extends DependencyContainer {
  authService: AuthService;
  userService: UserService;
  tripService: TripService;
  familyService: FamilyService;
  childService: ChildService;
  preferenceService: PreferenceService;
  schedulingService: SchedulingService;
  userRepository: UserRepository;
  familyRepository: FamilyRepository;
  childRepository: ChildRepository;
  loggers: {
    system: ILogger;
    trip: ILogger;
    auth: ILogger;
    user: ILogger;
  };
  // Explicitly include resolve method for type safety
  resolve<T>(token: string): T;
}

export function createContainer(): ServiceContainer {
  // Register services and repositories
  tsyringeContainer.register<AuthService>("AuthService", {
    useClass: AuthService,
  });
  tsyringeContainer.register<UserService>("UserService", {
    useClass: UserService,
  });
  tsyringeContainer.register<TripService>("TripService", {
    useClass: TripService,
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
  const logger = new AzureLogger();
  tsyringeContainer.register<ILogger>("ILogger", { useValue: logger });

  const serviceContainer = tsyringeContainer as ServiceContainer;

  // Add service getters
  Object.defineProperty(serviceContainer, "authService", {
    get: () => tsyringeContainer.resolve<AuthService>("AuthService"),
  });
  Object.defineProperty(serviceContainer, "userService", {
    get: () => tsyringeContainer.resolve<UserService>("UserService"),
  });
  Object.defineProperty(serviceContainer, "tripService", {
    get: () => tsyringeContainer.resolve<TripService>("TripService"),
  });
  Object.defineProperty(serviceContainer, "familyService", {
    get: () => tsyringeContainer.resolve<FamilyService>("FamilyService"),
  });
  Object.defineProperty(serviceContainer, "childService", {
    get: () => tsyringeContainer.resolve<ChildService>("ChildService"),
  });
  Object.defineProperty(serviceContainer, "preferenceService", {
    get: () =>
      tsyringeContainer.resolve<PreferenceService>("PreferenceService"),
  });
  Object.defineProperty(serviceContainer, "schedulingService", {
    get: () =>
      tsyringeContainer.resolve<SchedulingService>("SchedulingService"),
  });
  Object.defineProperty(serviceContainer, "userRepository", {
    get: () => tsyringeContainer.resolve<UserRepository>("UserRepository"),
  });
  Object.defineProperty(serviceContainer, "familyRepository", {
    get: () => tsyringeContainer.resolve<FamilyRepository>("FamilyRepository"),
  });
  Object.defineProperty(serviceContainer, "childRepository", {
    get: () => tsyringeContainer.resolve<ChildRepository>("ChildRepository"),
  });

  // Add logger getters
  Object.defineProperty(serviceContainer, "loggers", {
    get: () => ({
      system: logger,
      trip: logger,
      auth: logger,
      user: logger,
    }),
  });

  return serviceContainer;
}

export const container = createContainer();
export { DependencyContainer };
