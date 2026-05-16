/**
 * Reader Model
 */
export class ReaderModel {
  constructor(data) {
    this.id = data.id;
    this.readerId = data.readerId;
    this.name = data.name;
    this.readerType = data.readerType; // RFID | BARCODE | QR_CODE
    this.status = data.status; // ONLINE | OFFLINE | SCANNING
    this.currentSessionId = data.currentSessionId;
    this.companyId = data.companyId;
    this.lastActiveAt = data.lastActiveAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromResponse(apiData) {
    return new ReaderModel(apiData);
  }

  static fromArray(apiArray = []) {
    return apiArray.map((item) => new ReaderModel(item));
  }
}
