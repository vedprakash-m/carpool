"use client";

import React, { useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Message, MessageType, User } from "@vcarpool/shared";
import {
  ChevronDownIcon,
  MapPinIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  users: Record<string, User>;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  user?: User;
  showAvatar?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  user,
  showAvatar = true,
}) => {
  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday " + format(date, "HH:mm");
    } else {
      return format(date, "MMM dd, HH:mm");
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case "text":
        return (
          <p className="text-sm break-words whitespace-pre-wrap">
            {message.content}
          </p>
        );

      case "system":
        return (
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 rounded-full px-4 py-2 max-w-xs">
              <p className="text-xs text-gray-600 text-center">
                {message.content}
              </p>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <MapPinIcon className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Location shared
              </p>
              {message.metadata?.location?.address && (
                <p className="text-xs text-blue-700">
                  {message.metadata.location.address}
                </p>
              )}
            </div>
          </div>
        );

      case "image":
        return (
          <div className="max-w-xs">
            {message.metadata?.imageUrl ? (
              <img
                src={message.metadata.imageUrl}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <PhotoIcon className="h-4 w-4 text-gray-600" />
                <p className="text-sm text-gray-600">Image</p>
              </div>
            )}
            {message.content && (
              <p className="text-sm mt-1 break-words">{message.content}</p>
            )}
          </div>
        );

      default:
        return (
          <p className="text-sm break-words whitespace-pre-wrap">
            {message.content}
          </p>
        );
    }
  };

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">{renderMessageContent()}</div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex ${
          isOwn ? "flex-row-reverse" : "flex-row"
        } items-end max-w-xs lg:max-w-md`}
      >
        {/* Avatar */}
        {showAvatar && !isOwn && (
          <div className="flex-shrink-0 mr-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {user
                  ? user.firstName.charAt(0) + user.lastName.charAt(0)
                  : "?"}
              </span>
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          {/* Sender name for non-own messages */}
          {!isOwn && user && (
            <p className="text-xs font-medium text-gray-600 mb-1">
              {user.firstName} {user.lastName}
            </p>
          )}

          {renderMessageContent()}

          {/* Timestamp */}
          <div className={`flex items-center justify-end mt-1 space-x-1`}>
            <span
              className={`text-xs ${isOwn ? "text-blue-200" : "text-gray-500"}`}
            >
              {formatTime(message.createdAt)}
            </span>

            {/* Message status for own messages */}
            {isOwn && (
              <div className="flex">
                {message.editedAt && (
                  <span className="text-xs text-blue-200">edited</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  users,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: { date: string; messages: Message[] } | null = null;

    messages.forEach((message) => {
      const messageDate = format(message.createdAt, "yyyy-MM-dd");

      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = { date: messageDate, messages: [message] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  }, [messages]);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMMM dd, yyyy");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4 rotate-180" />
                <span>Load earlier messages</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Messages grouped by date */}
      <div className="px-4 pb-4">
        {groupedMessages.map((group) => (
          <div key={group.date} className="mb-6">
            {/* Date header */}
            <div className="flex justify-center mb-4">
              <div className="bg-gray-200 rounded-full px-3 py-1">
                <span className="text-xs text-gray-600 font-medium">
                  {formatDateHeader(group.date)}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            {group.messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const user = users[message.senderId];
              const prevMessage = index > 0 ? group.messages[index - 1] : null;
              const showAvatar =
                !prevMessage || prevMessage.senderId !== message.senderId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  user={user}
                  showAvatar={showAvatar}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No messages yet
            </h3>
            <p className="text-sm text-gray-500">Start the conversation!</p>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
