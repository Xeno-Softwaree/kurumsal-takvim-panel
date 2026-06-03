/**
 * Server-Sent Events (SSE) connection manager.
 *
 * Tracks one or more open SSE response streams per admin user.
 * When a notification is created, call broadcast(adminId, payload)
 * and every browser tab the admin has open will receive it instantly —
 * no polling needed.
 */

/** @type {Map<number, Set<import('express').Response>>} */
const clients = new Map();

/**
 * Register a new SSE client.
 * Sets the required headers and wires up the disconnect handler.
 *
 * @param {number} adminId
 * @param {import('express').Response} res
 */
function addClient(adminId, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.flushHeaders();

  // Send an initial "connected" event so the client knows the stream is live
  res.write('event: connected\ndata: {}\n\n');

  if (!clients.has(adminId)) {
    clients.set(adminId, new Set());
  }
  clients.get(adminId).add(res);

  // Clean up when the client disconnects
  res.on('close', () => {
    removeClient(adminId, res);
  });
}

/**
 * Remove a disconnected client.
 *
 * @param {number} adminId
 * @param {import('express').Response} res
 */
function removeClient(adminId, res) {
  const set = clients.get(adminId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(adminId);
}

/**
 * Push an SSE event to all open streams for a specific admin.
 *
 * @param {number} adminId
 * @param {object} data  - Will be JSON-serialised and sent as the event data.
 * @param {string} [eventName='notification']
 */
function broadcast(adminId, data, eventName = 'notification') {
  const set = clients.get(adminId);
  if (!set || set.size === 0) return;

  const chunk = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(chunk);
    } catch {
      removeClient(adminId, res);
    }
  }
}

/**
 * Push an SSE event to every currently connected admin.
 *
 * @param {object} data
 * @param {string} [eventName='notification']
 */
function broadcastAll(data, eventName = 'notification') {
  for (const adminId of clients.keys()) {
    broadcast(adminId, data, eventName);
  }
}

/** How many admins currently have an open SSE stream. */
function connectedCount() {
  return clients.size;
}

module.exports = { addClient, broadcast, broadcastAll, connectedCount };
