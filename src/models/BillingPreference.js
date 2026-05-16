export class BillingPreference {
  constructor(data) {
    this.id = data.id;

    this.billToId = data.billToId;
    this.billToType = data.billToType;

    this.billingType = data.billingType;
    this.fixedBillingAmount = data.fixedBillingAmount; 

    this.cycleDurationDays = data.cycleDurationDays;
    this.frequency = data.frequency;

    this.anchorDate = data.anchorDate;
    this.timezone = data.timezone;

    this.status = data.status;
    this.creditDays = data.creditDays;

    this.createdAt = data.createdAt;

    this.customerName =
      data.customerName ??
      `${data.billToType} - ${data.billToId}`;

    this.billToName = data.billToName ?? this.customerName;
  }

  static fromResponse(apiData) {
    return new BillingPreference(apiData);
  }

  static toCreatePayload(formData) {
    return {
      billToId: Number(formData.billToId),
      billToType: formData.billToType, // CUSTOMER | VENDOR
      cycleDurationDays: Number(formData.cycleDurationDays),
      frequency: formData.frequency,
      anchorDate: formData.anchorDate, // LocalDate (YYYY-MM-DD)
      timezone: formData.timezone,
      creditDays: Number(formData.creditDays),
      countryCode: formData.countryCode,
    };
  }
}