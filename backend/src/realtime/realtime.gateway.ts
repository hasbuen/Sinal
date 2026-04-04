import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { appConfig } from "../config/app.config";
import { AuthService } from "../modules/auth/auth.service";

type SocketUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

type AuthenticatedSocket = Socket & {
  data: {
    user?: SocketUser;
    roomsJoined?: Set<string>;
  };
};

function extractToken(client: Socket) {
  const authToken =
    typeof client.handshake.auth?.token === "string"
      ? client.handshake.auth.token
      : null;

  if (authToken) {
    return authToken.replace(/^Bearer\s+/i, "");
  }

  const headerValue = client.handshake.headers.authorization;
  if (typeof headerValue === "string") {
    return headerValue.replace(/^Bearer\s+/i, "");
  }

  return null;
}

@WebSocketGateway({
  cors: {
    origin: appConfig.allowAllFrontendOrigins ? true : appConfig.frontendOrigins,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection<AuthenticatedSocket>, OnGatewayDisconnect<AuthenticatedSocket>
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = extractToken(client);
    if (!token) {
      client.disconnect(true);
      throw new UnauthorizedException("Token ausente na conexao realtime.");
    }

    const user = await this.authService.verifyAccessToken(token);
    if (!user) {
      client.disconnect(true);
      throw new UnauthorizedException("Token invalido na conexao realtime.");
    }

    client.data.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    };
    client.data.roomsJoined = new Set<string>();

    await client.join(this.userRoom(user.id));
    this.logger.debug(`Socket conectado para user ${user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.logger.debug(`Socket desconectado para user ${userId}`);
    }
  }

  @SubscribeMessage("conversation:join")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const conversationId = payload?.conversationId?.trim();
    if (!conversationId) {
      return { ok: false };
    }

    const room = this.conversationRoom(conversationId);
    client.data.roomsJoined?.add(room);
    await client.join(room);
    return { ok: true };
  }

  @SubscribeMessage("conversation:leave")
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const conversationId = payload?.conversationId?.trim();
    if (!conversationId) {
      return { ok: false };
    }

    const room = this.conversationRoom(conversationId);
    client.data.roomsJoined?.delete(room);
    await client.leave(room);
    return { ok: true };
  }

  emitMessageEvent(payload: {
    conversationId: string;
    messageId: string;
    event: string;
  }) {
    this.server.to(this.conversationRoom(payload.conversationId)).emit(
      "message:event",
      payload,
    );
  }

  emitPresence(payload: {
    conversationId: string;
    userId: string;
    online: boolean;
    lastSeenAt?: Date | null;
    activeConversationId?: string | null;
  }) {
    this.server.to(this.conversationRoom(payload.conversationId)).emit(
      "presence:update",
      payload,
    );
  }

  emitCallSignal(payload: {
    conversationId: string;
    senderId: string;
    targetUserId?: string | null;
    type: string;
    payload?: Record<string, unknown> | null;
    createdAt: Date;
  }) {
    const eventName = "call:signal";
    if (payload.targetUserId) {
      this.server.to(this.userRoom(payload.targetUserId)).emit(eventName, payload);
      return;
    }

    this.server
      .to(this.conversationRoom(payload.conversationId))
      .emit(eventName, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
