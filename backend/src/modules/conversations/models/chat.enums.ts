import { registerEnumType } from "@nestjs/graphql";

export enum ConversationKind {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
}

export enum ConversationRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum MessageKind {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  FILE = "FILE",
  LINK = "LINK",
  EMOJI = "EMOJI",
  SYSTEM = "SYSTEM",
}

export enum MediaKind {
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  FILE = "FILE",
}

export enum MessageEventType {
  ADDED = "ADDED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
  RECEIPT = "RECEIPT",
}

export enum CallSignalType {
  OFFER = "OFFER",
  ANSWER = "ANSWER",
  ICE_CANDIDATE = "ICE_CANDIDATE",
  RINGING = "RINGING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  ENDED = "ENDED",
  TOGGLE_AUDIO = "TOGGLE_AUDIO",
  TOGGLE_VIDEO = "TOGGLE_VIDEO",
}

registerEnumType(ConversationKind, { name: "ConversationKind" });
registerEnumType(ConversationRole, { name: "ConversationRole" });
registerEnumType(MessageKind, { name: "MessageKind" });
registerEnumType(MediaKind, { name: "MediaKind" });
registerEnumType(MessageEventType, { name: "MessageEventType" });
registerEnumType(CallSignalType, { name: "CallSignalType" });
