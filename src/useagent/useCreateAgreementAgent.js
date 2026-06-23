import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the HotelList UI component.
 */
export function useCreateAgreementAgent({
  isAgreementDialogOpen,
  setValue,
  getValues,
  reset,
  append,
  products,
}) {
  useAgentForm('createAgreement', {
    fields: [
      { key: 'type', type: 'select', set: v => setValue('type', v) },
      { key: 'startDate', type: 'date', set: v => setValue('startDate', v) },
      { key: 'endDate', type: 'date', set: v => setValue('endDate', v) },
      { key: 'status', type: 'select', set: v => setValue('status', v) },
      { key: 'totalRooms', type: 'text', set: v => setValue('totalRooms', v) },
      { key: 'occupancyRate', type: 'text', set: v => setValue('occupancyRate', v) },
      { key: 'depositAmount', type: 'text', set: v => setValue('depositAmount', v) },
      { key: 'creditDays', type: 'text', set: v => setValue('creditDays', v) },
      { key: 'linenDeliveryDays', type: 'text', set: v => setValue('linenDeliveryDays', v) },
      { key: 'serviceFrequency', type: 'select', set: v => setValue('serviceFrequency', v) },
      { key: 'creditTermDays', type: 'text', set: v => setValue('creditTermDays', v) },
      { key: 'pickupFrequencyDays', type: 'text', set: v => setValue('pickupFrequencyDays', v) },
      { key: 'deliveryTatDays', type: 'text', set: v => setValue('deliveryTatDays', v) },
      { key: 'discountPercentage', type: 'text', set: v => setValue('discountPercentage', v) },
      { key: 'billingCycle', type: 'text', set: v => setValue('billingCycle', v) },
      { key: 'billingStartDay', type: 'text', set: v => setValue('billingStartDay', v) },
      { key: 'billingEndDay', type: 'text', set: v => setValue('billingEndDay', v) },
      { key: 'billingType', type: 'select', set: v => setValue('billingType', v) },
      { key: 'fixedMonthlyAmount', type: 'text', set: v => setValue('fixedMonthlyAmount', v) },
    ],
    subForms: [
      {
        id: 'priceItem',
        add: () => append({ productId: "", quantity: 0, price: 0, remarks: "", serviceType: "" }),
        fields: [
          { key: 'productId', type: 'select', setByIndex: (val, idx) => {
            let productId = val;
            if (typeof val === 'string') {
              const prod = products.find(p => p.name.toLowerCase() === val.toLowerCase() || p.id === val);
              if (prod) productId = prod.id;
            } else if (val && val.id) {
              productId = val.id;
            }
            setValue(`prices.${idx}.productId`, productId);
          }},
          { key: 'quantity', type: 'text', setByIndex: (v, i) => setValue(`prices.${i}.quantity`, v) },
          { key: 'price', type: 'text', setByIndex: (v, i) => setValue(`prices.${i}.price`, v) },
          { key: 'serviceType', type: 'select', setByIndex: (v, i) => setValue(`prices.${i}.serviceType`, v) },
          { key: 'remarks', type: 'text', setByIndex: (v, i) => setValue(`prices.${i}.remarks`, v) },
        ],
      },
    ],
    clearAll: () => reset(),
  }, isAgreementDialogOpen);
}
