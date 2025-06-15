import { AuthService } from "../../../services/auth.service";
import { UserRepositoryPort } from "../../user/ports/UserRepositoryPort";

export class LoginUseCase {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepositoryPort
  ) {}

  async execute(email: string, password: string) {
    // Delegate to AuthService.login which handles verification & token issuance
    return this.authService.login(email, password);
  }
} 