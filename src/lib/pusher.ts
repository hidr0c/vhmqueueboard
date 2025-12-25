import Pusher from "pusher";

// Check if Pusher credentials are available
const isPusherConfigured = 
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

// Server-side Pusher instance (only created if credentials exist)
// This should only be used in API routes (server-side)
export const pusherServer = isPusherConfigured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

// Channel names
export const CHANNELS = {
  QUEUE: "queue-channel",
};

// Event names
export const EVENTS = {
  ENTRY_UPDATED: "entry-updated",
  ENTRY_CREATED: "entry-created",
  ENTRY_DELETED: "entry-deleted",
  SYNC_ALL: "sync-all",
};

// Helper function to trigger queue updates
export async function triggerQueueUpdate(
  event: string,
  data: any
): Promise<void> {
  // Skip if Pusher is not configured
  if (!pusherServer) {
    console.log("⚪ Pusher not configured - skipping real-time broadcast");
    return;
  }

  try {
    await pusherServer.trigger(CHANNELS.QUEUE, event, data);
    console.log(`📡 Pusher: Broadcasted ${event}`);
  } catch (error) {
    console.error("Failed to trigger Pusher event:", error);
    // Don't throw - we don't want Pusher failures to break the API
  }
}
