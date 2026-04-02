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

registerEnumType(ConversationKind, { name: "ConversationKind" });
registerEnumType(ConversationRole, { name: "ConversationRole" });
registerEnumType(MessageKind, { name: "MessageKind" });
registerEnumType(MediaKind, { name: "MediaKind" });
