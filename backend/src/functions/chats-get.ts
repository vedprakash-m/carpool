import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { containers } from "../config/database";
import { MessagingService } from "../services/messaging.service";
import {
  MessageRepository,
  ChatRepository,
  ChatParticipantRepository,
} from "../repositories/message.repository";
import { UserRepository } from "../repositories/user.repository";
import { TripRepository } from "../repositories/trip.repository";
import { handleRequest } from "../utils/request-handler";
import { handleValidation } from "../utils/validation-handler";
import { chatsQuerySchema } from "@vcarpool/shared";

export async function chatsGet(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return handleRequest(request, context, async (userId: string) => {
    // Validate query parameters
    const query = handleValidation(chatsQuerySchema, {
      tripId: request.query.get("tripId"),
      includeInactive: request.query.get("includeInactive") === "true",
      page: parseInt(request.query.get("page") || "1"),
      limit: parseInt(request.query.get("limit") || "10"),
    });

    // Initialize repositories and service
    const messageRepository = new MessageRepository(containers.messages);
    const chatRepository = new ChatRepository(containers.chats);
    const participantRepository = new ChatParticipantRepository(
      containers.chatParticipants
    );
    const userRepository = new UserRepository(containers.users);
    const tripRepository = new TripRepository(containers.trips);

    const messagingService = new MessagingService(
      messageRepository,
      chatRepository,
      participantRepository,
      userRepository,
      tripRepository
    );

    // Ensure page and limit have default values
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get user's chats
    const { chats, total } = await messagingService.getUserChats(userId, {
      includeInactive: query.includeInactive,
      limit: limit,
      offset,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: chats,
        pagination: {
          page: page,
          limit: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  });
}

app.http("chats-get", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "chats",
  handler: chatsGet,
});
