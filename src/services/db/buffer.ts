import { Buffer } from 'buffer';

const MAX_PACKET_SIZE = 0xffffff;

export interface MySQLPacket {
  payload: Buffer;
  sequenceId: number;
}

export function readPacketHeader(buf: Buffer, offset: number): {
  length: number;
  sequenceId: number;
} {
  const length = buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
  const sequenceId = buf[offset + 3];
  return { length, sequenceId };
}

export function buildPacket(payload: Buffer, sequenceId: number): Buffer {
  if (payload.length > MAX_PACKET_SIZE) {
    throw new Error(`Packet payload too large: ${payload.length} > ${MAX_PACKET_SIZE}`);
  }
  const header = Buffer.allocUnsafe(4);
  header[0] = payload.length & 0xff;
  header[1] = (payload.length >> 8) & 0xff;
  header[2] = (payload.length >> 16) & 0xff;
  header[3] = sequenceId & 0xff;
  return Buffer.concat([header, payload]);
}

export function readLengthEncodedInteger(buf: Buffer, offset: number): { value: number | bigint | null; bytesRead: number } {
  const first = buf[offset];
  if (first === undefined) return { value: null, bytesRead: 0 };
  if (first < 0xfb) return { value: first, bytesRead: 1 };
  if (first === 0xfc) {
    return { value: buf.readUInt16LE(offset + 1), bytesRead: 3 };
  }
  if (first === 0xfd) {
    const value = (buf[offset + 1]) | (buf[offset + 2] << 8) | (buf[offset + 3] << 16);
    return { value, bytesRead: 4 };
  }
  if (first === 0xfe) {
    const hi = buf.readUInt32LE(offset + 1);
    const lo = buf.readUInt32LE(offset + 5);
    return { value: (BigInt(hi) << 32n) | BigInt(lo), bytesRead: 9 };
  }
  if (first === 0xfb) return { value: null, bytesRead: 1 };
  if (first === 0xff) return { value: undefined as any, bytesRead: 1 };
  return { value: first, bytesRead: 1 };
}

export function readLengthEncodedString(buf: Buffer, offset: number): { value: string | null; bytesRead: number } {
  const { value, bytesRead } = readLengthEncodedInteger(buf, offset);
  if (value === null) return { value: null, bytesRead };
  const len = Number(value);
  if (isNaN(len) || len === 0) return { value: '', bytesRead };
  return { value: buf.slice(offset + bytesRead, offset + bytesRead + len).toString('utf8'), bytesRead: bytesRead + len };
}

export function readNullTerminatedString(buf: Buffer, offset: number): { value: string; bytesRead: number } {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  const value = buf.slice(offset, end).toString('utf8');
  return { value, bytesRead: end - offset + 1 };
}

export function writeLengthEncodedInteger(value: number | bigint | null): Buffer {
  if (value === null || value === undefined) return Buffer.from([0xfb]);
  if (typeof value === 'bigint') throw new Error('BigInt not supported for encoding');
  if (value < 251) return Buffer.from([value]);
  if (value < 65536) {
    const buf = Buffer.allocUnsafe(3);
    buf[0] = 0xfc;
    buf.writeUInt16LE(value, 1);
    return buf;
  }
  if (value < 16777216) {
    const buf = Buffer.allocUnsafe(4);
    buf[0] = 0xfd;
    buf[1] = value & 0xff;
    buf[2] = (value >> 8) & 0xff;
    buf[3] = (value >> 16) & 0xff;
    return buf;
  }
  const buf = Buffer.allocUnsafe(9);
  buf[0] = 0xfe;
  buf.writeUInt32LE(value & 0xffffffff, 1);
  buf.writeUInt32LE(0, 5);
  return buf;
}
