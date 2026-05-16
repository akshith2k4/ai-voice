export class BillingCycle {
  constructor(data) {
    this.id = data.id;

    this.billToId = data.billToId;
    this.billToType = data.billToType;
    this.billToName = data.billToName ?? `${data.billToType} - ${data.billToId}`;

    this.startAt = data.startAt;
    this.endAt = data.endAt;

    this.status = data.status;
    this.cycleDurationDays = data.cycleDurationDays;
    this.cycleId = data.id;
    this.customerName =
      data.customerName ??
      `${data.billToType} - ${data.billToId}`;

    this.startDate = data.startAt;
    this.endDate = data.endAt;


    this.totalBillableAmount = data.totalBillableAmount ?? null;
    this.invoiceStatus = data.invoiceStatus ?? null;
    this.invoiceId = data.invoiceId ?? null;
    this.invoiceNumber = data.invoiceNumber ?? null;
    this.annexureExcelUrl = data.annexureExcelUrl ?? null;
    this.createdDate = data.createdTime ?? null;
  }

  static fromResponse(apiData) {
    return new BillingCycle(apiData);
  }
}