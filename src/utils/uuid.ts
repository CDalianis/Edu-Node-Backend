export const uuidToBinary = (uuid: string): any => {
  const hex = uuid.replace(/-/g, "");
  const buffer = Buffer.from(hex, "hex");
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new Uint8Array(arrayBuffer);
};

export const binaryToUuid = (binary: Uint8Array): string => {
  const hex = Buffer.from(binary).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
