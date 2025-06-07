"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CarpoolChatProps {
  groupId: string;
  userId: string;
  userName: string;
}

interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  senderRole: "parent" | "trip_admin";
  content: {
    text?: string;
    voiceUrl?: string;
    voiceDuration?: number;
    photoUrl?: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
      label: string;
    };
    quickAction?: {
      type: string;
      data: any;
    };
  };
  messageType:
    | "text"
    | "voice"
    | "photo"
    | "location"
    | "system"
    | "quick_action";
  contextTags: { type: string; value: string; display: string }[];
  timestamp: string;
  priority: "low" | "normal" | "high" | "urgent";
  reactions: { userId: string; emoji: string }[];
  readBy: { userId: string; readAt: string }[];
  carpool_context: {
    urgencyLevel: "info" | "attention" | "urgent" | "emergency";
    relatedDate?: string;
    relatedChildren?: string[];
    actionRequired?: {
      type: "confirmation" | "response";
      deadline?: string;
      respondedUsers: string[];
    };
  };
}

const QUICK_ACTIONS = [
  {
    id: "running_late",
    icon: "🕐",
    text: "Running Late",
    color: "bg-yellow-500",
  },
  {
    id: "pickup_complete",
    icon: "✅",
    text: "Pickup Complete",
    color: "bg-green-500",
  },
  { id: "emergency", icon: "🚨", text: "Emergency", color: "bg-red-500" },
  {
    id: "route_change",
    icon: "📍",
    text: "Route Change",
    color: "bg-blue-500",
  },
];

export default function CarpoolChat({
  groupId,
  userId,
  userName,
}: CarpoolChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    loadMessages();
    // Set up real-time message updates
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/communication/messages/${groupId}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async (content: any, messageType: string = "text") => {
    if (!content.text?.trim() && messageType === "text") return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/communication/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          content,
          messageType,
          priority: messageType === "quick_action" ? "high" : "normal",
          threadId: activeThread,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        setShowQuickActions(false);
        loadMessages(); // Refresh messages
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuickAction = (actionType: string) => {
    const action = QUICK_ACTIONS.find((a) => a.id === actionType);
    sendMessage(
      {
        text: `${action?.text} - ${new Date().toLocaleTimeString()}`,
        quickAction: {
          type: actionType,
          data: { timestamp: new Date().toISOString() },
        },
      },
      "quick_action"
    );
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    const audioData = await blobToBase64(audioBlob);
    const duration = 10; // Estimate - in real implementation, calculate actual duration

    try {
      const response = await fetch("/api/communication/voice-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          audioData,
          duration,
        }),
      });

      if (response.ok) {
        loadMessages();
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/communication/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      loadMessages();
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString();
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.senderId === userId;
    const showDate =
      index === 0 ||
      new Date(message.timestamp).toDateString() !==
        new Date(messages[index - 1].timestamp).toDateString();

    const urgencyStyles = {
      info: "border-l-blue-400",
      attention: "border-l-yellow-400",
      urgent: "border-l-orange-400",
      emergency: "border-l-red-400 bg-red-50",
    };

    return (
      <div key={message.messageId} className="mb-4">
        {showDate && (
          <div className="text-center text-sm text-gray-500 mb-4">
            {formatDate(message.timestamp)}
          </div>
        )}

        <div
          className={`flex ${
            isOwnMessage ? "justify-end" : "justify-start"
          } mb-2`}
        >
          <div
            className={`
              max-w-xs lg:max-w-md px-4 py-2 rounded-lg border-l-4
              ${
                isOwnMessage
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800 shadow-sm"
              }
              ${urgencyStyles[message.carpool_context.urgencyLevel]}
            `}
          >
            {/* Sender info for group messages */}
            {!isOwnMessage && (
              <div className="text-sm font-medium mb-1">
                {message.senderName}
                {message.senderRole === "trip_admin" && (
                  <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1 rounded">
                    Admin
                  </span>
                )}
              </div>
            )}

            {/* Context tags */}
            {message.contextTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {message.contextTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    {tag.display}
                  </span>
                ))}
              </div>
            )}

            {/* Message content */}
            {message.messageType === "text" && (
              <div className="text-sm">{message.content.text}</div>
            )}

            {message.messageType === "voice" && (
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">▶</span>
                </button>
                <span className="text-sm">
                  {message.content.voiceDuration}s
                </span>
              </div>
            )}

            {message.messageType === "location" && (
              <div className="text-sm">
                📍 {message.content.location?.label || "Location shared"}
                <div className="text-xs opacity-75 mt-1">
                  {message.content.location?.address}
                </div>
              </div>
            )}

            {message.messageType === "quick_action" && (
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {
                    QUICK_ACTIONS.find(
                      (a) => a.id === message.content.quickAction?.type
                    )?.icon
                  }
                </span>
                <span className="text-sm font-medium">
                  {message.content.text}
                </span>
              </div>
            )}

            {/* Action required indicator */}
            {message.carpool_context.actionRequired && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                ⏰ Response needed by{" "}
                {formatTime(message.carpool_context.actionRequired.deadline!)}
                <div className="mt-1">
                  {message.carpool_context.actionRequired.respondedUsers.length}{" "}
                  of {messages.length} responded
                </div>
                {!message.carpool_context.actionRequired.respondedUsers.includes(
                  userId
                ) && (
                  <Button
                    size="sm"
                    className="mt-1 h-6 text-xs"
                    onClick={() => respondToAction(message.messageId)}
                  >
                    Confirm
                  </Button>
                )}
              </div>
            )}

            {/* Message reactions */}
            {message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(
                  message.reactions.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(message.messageId, emoji)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full"
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div
              className={`text-xs mt-1 ${
                isOwnMessage ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {formatTime(message.timestamp)}
              {isOwnMessage && (
                <span className="ml-2">
                  {message.readBy.length > 1 ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const respondToAction = async (messageId: string) => {
    try {
      await fetch(`/api/communication/messages/${messageId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "confirmed" }),
      });
      loadMessages();
    } catch (error) {
      console.error("Failed to respond to action:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Group Chat</h2>
        <p className="text-sm text-gray-600">
          {
            messages.filter(
              (m) =>
                m.carpool_context.urgencyLevel === "urgent" ||
                m.carpool_context.urgencyLevel === "emergency"
            ).length
          }{" "}
          urgent messages
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => renderMessage(message, index))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="bg-white border-t p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                onClick={() => sendQuickAction(action.id)}
                className={`${action.color} text-white h-12 text-sm`}
              >
                <span className="mr-2 text-lg">{action.icon}</span>
                {action.text}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowQuickActions(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex-shrink-0"
          >
            ⚡
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            className={`flex-shrink-0 ${
              isRecording ? "bg-red-500 text-white" : ""
            }`}
          >
            🎤
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage({ text: newMessage });
              }
            }}
          />

          <Button
            onClick={() => sendMessage({ text: newMessage })}
            disabled={isLoading || !newMessage.trim()}
            className="flex-shrink-0"
          >
            Send
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          💡 Use quick actions (⚡) for instant updates while driving
        </div>
      </div>
    </div>
  );
}

// Helper functions
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
