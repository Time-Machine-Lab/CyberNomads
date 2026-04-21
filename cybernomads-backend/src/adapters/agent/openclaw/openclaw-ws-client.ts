import { randomUUID, sign, createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AgentProviderContext } from "../../../ports/agent-provider-port.js";
import { OpenClawProviderError } from "./openclaw-http-client.js";

const OPENCLAW_PROTOCOL_VERSION = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_CONNECT_SCOPES = ["operator.admin"];
const DEFAULT_CLIENT_ID = "gateway-client";
const DEFAULT_CLIENT_MODE = "backend";
const DEFAULT_CLIENT_VERSION = "cybernomads-backend/0.1.0";

export interface OpenClawGatewayRequestOptions {
  timeoutMs?: number;
}

interface OpenClawDeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface OpenClawRequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
}

interface OpenClawResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}

interface OpenClawEventFrame {
  type: "event";
  event: string;
  payload?: unknown;
}

type OpenClawFrame =
  | OpenClawResponseFrame
  | OpenClawEventFrame
  | {
      type: "close";
      code?: number;
      reason?: string;
    };

export class OpenClawWsClient {
  constructor(
    private readonly options: {
      createRequestId?: () => string;
      now?: () => Date;
      loadDeviceIdentity?: () => Promise<OpenClawDeviceIdentity | null>;
      webSocketFactory?: (url: string) => WebSocket;
    } = {},
  ) {}

  async request(
    context: AgentProviderContext,
    method: string,
    params: Record<string, unknown>,
    options: OpenClawGatewayRequestOptions = {},
  ): Promise<unknown> {
    const requestTimeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const socket = (this.options.webSocketFactory ?? ((url) => new WebSocket(url)))(
      toWebSocketUrl(context.endpointUrl),
    );

    const session = new OpenClawSocketSession(socket, requestTimeoutMs);

    try {
      await session.waitForOpen();
      const challenge = await session.waitForEvent("connect.challenge");
      const connectResult = await session.sendRequest("connect", await this.buildConnectParams(
        context,
        readChallengeNonce(challenge),
      ));

      if (!connectResult.ok) {
        throw new OpenClawProviderError(toGatewayErrorMessage(connectResult));
      }

      const response = await session.sendRequest(method, params);

      if (!response.ok) {
        throw new OpenClawProviderError(toGatewayErrorMessage(response));
      }

      return response.payload;
    } finally {
      socket.close();
    }
  }

  private async buildConnectParams(
    context: AgentProviderContext,
    nonce: string,
  ): Promise<Record<string, unknown>> {
    const connectAuth = buildConnectAuth(context);
    const deviceIdentity = await (
      this.options.loadDeviceIdentity ?? loadLocalOpenClawDeviceIdentity
    )();

    const connectParams: Record<string, unknown> = {
      minProtocol: OPENCLAW_PROTOCOL_VERSION,
      maxProtocol: OPENCLAW_PROTOCOL_VERSION,
      client: {
        id: DEFAULT_CLIENT_ID,
        version: DEFAULT_CLIENT_VERSION,
        platform: process.platform,
        mode: DEFAULT_CLIENT_MODE,
      },
      auth: connectAuth,
      role: "operator",
    };

    if (deviceIdentity) {
      const signedAt = (this.options.now ?? (() => new Date()))().getTime();
      const tokenForSignature =
        connectAuth.token ?? connectAuth.deviceToken ?? null;
      const payload = buildDeviceAuthPayload({
        deviceId: deviceIdentity.deviceId,
        clientId: DEFAULT_CLIENT_ID,
        clientMode: DEFAULT_CLIENT_MODE,
        role: "operator",
        scopes: DEFAULT_CONNECT_SCOPES,
        signedAtMs: signedAt,
        token: tokenForSignature,
        nonce,
      });

      connectParams.scopes = DEFAULT_CONNECT_SCOPES;
      connectParams.device = {
        id: deviceIdentity.deviceId,
        publicKey: toOpenClawPublicKey(deviceIdentity.publicKeyPem),
        signature: sign(null, Buffer.from(payload), deviceIdentity.privateKeyPem)
          .toString("base64url"),
        signedAt,
        nonce,
      };
    }

    return connectParams;
  }
}

class OpenClawSocketSession {
  private readonly frames: OpenClawFrame[] = [];
  private notifyWaiter: (() => void) | null = null;

  constructor(
    private readonly socket: WebSocket,
    private readonly timeoutMs: number,
  ) {
    this.socket.addEventListener("message", (event: any) => {
      this.pushFrame(parseGatewayFrame(String(event.data)));
    });
    this.socket.addEventListener("close", (event: any) => {
      this.pushFrame({
        type: "close",
        code: event.code,
        reason: event.reason,
      });
    });
    this.socket.addEventListener("error", () => {
      this.pushFrame({
        type: "close",
        reason: "OpenClaw gateway websocket error.",
      });
    });
  }

  async waitForOpen(): Promise<void> {
    if (this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(
          new OpenClawProviderError(
            "Unable to open the OpenClaw gateway websocket.",
          ),
        );
      };
      const cleanup = () => {
        this.socket.removeEventListener("open", handleOpen);
        this.socket.removeEventListener("error", handleError);
      };

      this.socket.addEventListener("open", handleOpen);
      this.socket.addEventListener("error", handleError);
    });
  }

  async waitForEvent(eventName: string): Promise<OpenClawEventFrame> {
    while (true) {
      const frame = await this.nextFrame();

      if (frame.type === "close") {
        throw new OpenClawProviderError(
          frame.reason ?? "OpenClaw gateway connection closed unexpectedly.",
        );
      }

      if (frame.type === "event" && frame.event === eventName) {
        return frame;
      }
    }
  }

  async sendRequest(
    method: string,
    params: Record<string, unknown>,
  ): Promise<OpenClawResponseFrame> {
    const requestId = randomUUID();
    const frame: OpenClawRequestFrame = {
      type: "req",
      id: requestId,
      method,
      params,
    };

    this.socket.send(JSON.stringify(frame));

    while (true) {
      const next = await this.nextFrame();

      if (next.type === "close") {
        throw new OpenClawProviderError(
          next.reason ?? "OpenClaw gateway connection closed unexpectedly.",
        );
      }

      if (next.type === "res" && next.id === requestId) {
        return next;
      }
    }
  }

  private async nextFrame(): Promise<OpenClawFrame> {
    if (this.frames.length > 0) {
      return this.frames.shift()!;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.notifyWaiter = null;
        reject(
          new OpenClawProviderError("Timed out waiting for OpenClaw gateway."),
        );
      }, this.timeoutMs);

      this.notifyWaiter = () => {
        clearTimeout(timer);
        this.notifyWaiter = null;
        resolve();
      };
    });

    return this.frames.shift()!;
  }

  private pushFrame(frame: OpenClawFrame): void {
    this.frames.push(frame);

    if (this.notifyWaiter) {
      this.notifyWaiter();
    }
  }
}

function parseGatewayFrame(raw: string): OpenClawFrame {
  try {
    return JSON.parse(raw) as OpenClawFrame;
  } catch (error) {
    throw new OpenClawProviderError(
      "OpenClaw gateway returned an invalid websocket frame.",
      { cause: error },
    );
  }
}

function buildConnectAuth(
  context: AgentProviderContext,
): {
  token?: string;
  deviceToken?: string;
  password?: string;
} {
  const secret = context.credential.secret.trim();

  if (secret.length === 0) {
    throw new OpenClawProviderError("OpenClaw credential secret is required.");
  }

  const authenticationKind = context.authenticationKind.trim().toLowerCase();

  if (authenticationKind.includes("device")) {
    return { deviceToken: secret };
  }

  if (authenticationKind.includes("password")) {
    return { password: secret };
  }

  return { token: secret };
}

function buildDeviceAuthPayload(input: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
}): string {
  return [
    "v2",
    input.deviceId,
    input.clientId,
    input.clientMode,
    input.role,
    input.scopes.join(","),
    String(input.signedAtMs),
    input.token ?? "",
    input.nonce,
  ].join("|");
}

function readChallengeNonce(frame: OpenClawEventFrame): string {
  const payload = asRecord(frame.payload);
  const nonce = payload?.nonce;

  if (typeof nonce !== "string" || nonce.trim().length === 0) {
    throw new OpenClawProviderError(
      "OpenClaw gateway did not provide a websocket challenge nonce.",
    );
  }

  return nonce;
}

function toOpenClawPublicKey(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const der = key.export({ format: "der", type: "spki" });

  return Buffer.from(der).subarray(-32).toString("base64url");
}

function toWebSocketUrl(endpointUrl: string): string {
  const parsed = new URL(endpointUrl);

  if (parsed.protocol === "http:") {
    parsed.protocol = "ws:";
  } else if (parsed.protocol === "https:") {
    parsed.protocol = "wss:";
  }

  if (parsed.pathname === "/") {
    parsed.pathname = "";
  }

  return parsed.toString();
}

function toGatewayErrorMessage(response: OpenClawResponseFrame): string {
  if (typeof response.error?.message === "string") {
    return response.error.message;
  }

  return "OpenClaw gateway request failed.";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

async function loadLocalOpenClawDeviceIdentity(): Promise<OpenClawDeviceIdentity | null> {
  const homeDirectory =
    process.env.OPENCLAW_HOME ??
    process.env.USERPROFILE ??
    process.env.HOME;

  if (!homeDirectory) {
    return null;
  }

  try {
    const raw = await readFile(
      join(homeDirectory, ".openclaw", "identity", "device.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (
      typeof parsed.deviceId !== "string" ||
      typeof parsed.publicKeyPem !== "string" ||
      typeof parsed.privateKeyPem !== "string"
    ) {
      return null;
    }

    return {
      deviceId: parsed.deviceId,
      publicKeyPem: parsed.publicKeyPem,
      privateKeyPem: parsed.privateKeyPem,
    };
  } catch {
    return null;
  }
}
