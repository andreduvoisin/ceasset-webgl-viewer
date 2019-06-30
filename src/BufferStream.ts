class BufferStream {
  private dataView: DataView;
  private readonly isLittleEndian: boolean;
  private currentByteOffset: number;

  constructor(buffer: ArrayBuffer, isLittleEndian: boolean) {
    this.dataView = new DataView(buffer);
    this.isLittleEndian = isLittleEndian;
    this.currentByteOffset = 0;
  }

  hasData(): boolean {
    return this.currentByteOffset < this.dataView.byteLength;
  }

  getChar(): string {
    const charCode = this.getInt8();
    return String.fromCharCode(charCode);
  }

  getByte(): number {
    return this.getUint8();
  }

  getInt8(): number {
    const value = this.dataView.getInt8(this.currentByteOffset);
    this.currentByteOffset += 1;
    return value;
  }

  getUint8(): number {
    const value = this.dataView.getUint8(this.currentByteOffset);
    this.currentByteOffset += 1;
    return value;
  }

  getInt16(): number {
    const value = this.dataView.getInt16(
      this.currentByteOffset,
      this.isLittleEndian
    );
    this.currentByteOffset += 2;
    return value;
  }

  getInt32(): number {
    const value = this.dataView.getInt32(
      this.currentByteOffset,
      this.isLittleEndian
    );
    this.currentByteOffset += 4;
    return value;
  }

  getUint32(): number {
    const value = this.dataView.getUint32(
      this.currentByteOffset,
      this.isLittleEndian
    );
    this.currentByteOffset += 4;
    return value;
  }

  getFloat32(): number {
    const value = this.dataView.getFloat32(
      this.currentByteOffset,
      this.isLittleEndian
    );
    this.currentByteOffset += 4;
    return value;
  }

  getString(): string {
    let result = "";

    let char = this.getChar();
    while (char !== "\0") {
      result += char;
      char = this.getChar();
    }

    return result;
  }
}

export default BufferStream;
