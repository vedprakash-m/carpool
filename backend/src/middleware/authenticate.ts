import { AuthenticatedUser } from '../types/authenticated-user';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      auth?: AuthenticatedUser;
    }
  }
}
