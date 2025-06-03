"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  MapPinIcon,
  FaceSmileIcon,
} from "@heroicons/react/24/outline";
import { SendMessageRequest, MessageType } from "@vcarpool/shared";

interface MessageInputProps {
  onSendMessage: (message: SendMessageRequest) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 1000,
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Common emojis for quick access
  const quickEmojis = [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😊",
    "😎",
    "🤔",
    "😢",
    "😭",
    "😡",
    "👍",
    "👎",
    "❤️",
    "🔥",
    "💯",
    "🙏",
  ];

  const handleMessageChange = useCallback(
    (value: string) => {
      setMessage(value);

      // Handle typing indicator
      if (onTyping) {
        if (!isTyping && value.trim()) {
          setIsTyping(true);
          onTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTyping(false);
        }, 1000);
      }
    },
    [isTyping, onTyping]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    const messageData: SendMessageRequest = {
      content: trimmedMessage,
      type: "text",
    };

    onSendMessage(messageData);
    setMessage("");

    // Clear typing indicator
    if (isTyping && onTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    handleMessageChange(newMessage);

    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 120px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const messageData: SendMessageRequest = {
          content: "Shared location",
          type: "location",
          metadata: {
            location: {
              latitude,
              longitude,
            },
          },
        };

        onSendMessage(messageData);
        setAttachmentMenu(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    // TODO: Implement image upload to storage service
    // For now, just send a placeholder message
    const messageData: SendMessageRequest = {
      content: "Image uploaded",
      type: "image",
      metadata: {
        imageUrl: URL.createObjectURL(file), // Temporary URL for preview
      },
    };

    onSendMessage(messageData);
    setAttachmentMenu(false);

    // Reset file input
    e.target.value = "";
  };

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="border-t bg-white p-4">
      {/* Quick emoji bar */}
      {showEmojiPicker && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {quickEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment menu */}
      {attachmentMenu && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex space-x-2">
            <button
              onClick={handleLocationShare}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <MapPinIcon className="h-4 w-4" />
              <span className="text-sm">Share Location</span>
            </button>

            <label className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">Upload Image</span>
            </label>
          </div>
        </div>
      )}

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => setAttachmentMenu(!attachmentMenu)}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          disabled={disabled}
        >
          <PaperClipIcon className="h-5 w-5" />
        </button>

        {/* Message input container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= maxLength) {
                setMessage(newValue);
                handleMessageChange(newValue);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              isOverLimit ? "border-red-500 focus:ring-red-500" : ""
            }`}
            style={{ minHeight: "40px", maxHeight: "120px" }}
            rows={1}
          />

          {/* Character count */}
          {(isNearLimit || isOverLimit) && (
            <div
              className={`absolute -bottom-5 right-0 text-xs ${
                isOverLimit ? "text-red-500" : "text-gray-500"
              }`}
            >
              {characterCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          disabled={disabled}
        >
          <FaceSmileIcon className="h-5 w-5" />
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled || isOverLimit}
          className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
