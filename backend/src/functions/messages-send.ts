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
import { sendMessageSchema, SendMessageRequest } from "@vcarpool/shared";

export async function messagesSend(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return handleRequest(request, context, async (userId: string) => {
    try {
      // Get chatId from route parameters
      const chatId = request.params.chatId;
      if (!chatId) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: "Chat ID is required",
          },
        };
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = handleValidation(sendMessageSchema, body);

      // Ensure the message data conforms to SendMessageRequest type
      const messageData: SendMessageRequest = {
        content: validatedData.content,
        type: validatedData.type || "text", // Provide default if undefined
        metadata: validatedData.metadata,
      };

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

      // Send message
      const message = await messagingService.sendMessage(
        chatId,
        userId,
        messageData
      );

      return {
        status: 201,
        jsonBody: {
          success: true,
          data: message,
          message: "Message sent successfully",
        },
      };
    } catch (error: any) {
      context.error("Error sending message:", error);
      return {
        status: error.statusCode || 500,
        jsonBody: {
          success: false,
          error: error.message || "Failed to send message",
        },
      };
    }
  });
}

app.http("messages-send", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "chats/{chatId}/messages",
  handler: messagesSend,
});
