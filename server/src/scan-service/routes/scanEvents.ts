import type { Request, Response } from 'express';
import { SCAN_EVENT_TYPE, type Scan, type ScanEvent } from '@scan/shared';
import { HTTP_STATUS, HttpError } from '../../common/http/errors';
import type { ScanService } from '../../common/scans/scanService';
import { isTerminalStatus } from '../../common/scans/scanStatus';

const HEARTBEAT_INTERVAL_MS = 15_000;
const RETRY_AFTER_DISCONNECT_MS = 3000;

/** Streams the scan as Server-Sent Events: a snapshot first, then every change, closing once it finishes. */
export const streamScanEvents = (scans: ScanService) => async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  let heartbeat: NodeJS.Timeout | undefined;
  let closed = false;
  /** Until the snapshot is sent, changes are only remembered; afterwards they are streamed. */
  let latest: Scan | undefined;
  let onChange: (scan: Scan) => void = (scan) => {
    latest = scan;
  };

  // Subscribe before reading, so a change saved while the snapshot loads is not lost.
  const unsubscribe = scans.subscribe((scan) => {
    if (scan.id === id) onChange(scan);
  });
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    if (res.headersSent) res.end();
  };
  res.on('close', close);

  const initial = await scans.get(id).catch((error: unknown) => {
    close();
    throw error;
  });
  if (!initial) {
    close();
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Scan not found');
  }
  if (closed) return;

  res.writeHead(HTTP_STATUS.OK, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: ${RETRY_AFTER_DISCONNECT_MS}\n\n`);
  heartbeat = setInterval(() => res.write(': keep-alive\n\n'), HEARTBEAT_INTERVAL_MS);

  /** Progress events carry only status and stages; the result and findings go out once, with the final event. */
  const send = (type: ScanEvent['type'], scan: Scan) => {
    const finished = isTerminalStatus(scan.status);
    const { result: _result, ...progress } = scan;
    const event: ScanEvent = { type, scan: finished ? scan : progress };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (finished) close();
  };

  send(SCAN_EVENT_TYPE.SNAPSHOT, latest && latest.updatedAt > initial.updatedAt ? latest : initial);
  onChange = (scan) => send(SCAN_EVENT_TYPE.UPDATE, scan);
};
