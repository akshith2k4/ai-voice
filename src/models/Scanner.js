/**
 * Reader Model (RFID / Barcode / QR)
 * Matches ReaderDTO from /api/readers contract
 */
export class Scanner {
  constructor(data) {
    this.id = data.id;

    // 🔴 Contract uses readerId (not machineId)
    this.readerId = data.readerId;

    this.name = data.name;
    this.readerType = data.readerType; // RFID | BARCODE | QR_CODE
    this.status = data.status; // ONLINE | OFFLINE | SCANNING

    this.currentSessionId = data.currentSessionId ?? null;
    this.companyId = data.companyId;
    this.lastActiveAt = data.lastActiveAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    /* Derived flags (API aligned & simple) */
    this.isOnline = this.status === "ONLINE";
    this.isOffline = this.status === "OFFLINE";
    this.isScanning = this.status === "SCANNING";
  }

  static fromResponse(apiData) {
    return new Scanner(apiData);
  }

  static fromArray(apiArray = []) {
    return apiArray.map((item) => new Scanner(item));
  }
}
