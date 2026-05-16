export class Invoice {
  constructor(data) {
    this.id = data.id;
    this.invoiceNumber = data.invoiceNumber;

    this.totalAmount = data.totalAmount;
    this.status = data.status;

    this.issueDate = data.issueDate;
    this.dueDate = data.dueDate;

    this.buyerId = data.buyerInfo?.userId;
    this.buyerName = data.buyerInfo?.name ?? "Unknown";

    // UI friendly 
    this.customerName = this.buyerName;
  }

  static fromResponse(apiData) {
    return new Invoice(apiData);
  }
}