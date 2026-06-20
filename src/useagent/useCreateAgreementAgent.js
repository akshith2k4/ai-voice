import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the HotelList UI component.
 */
export function useCreateAgreementAgent({
  isAgreementDialogOpen,
  handleAgreementFormChange,
  handleAddPriceItem,
  products,
  handlePriceItemChange,
  resetAgreementForm,
}) {
  useAgentForm('createAgreement', {
    fields: [
      { key: 'type', type: 'select', set: v => handleAgreementFormChange('type', v) },
      { key: 'startDate', type: 'date', set: v => handleAgreementFormChange('startDate', v) },
      { key: 'endDate', type: 'date', set: v => handleAgreementFormChange('endDate', v) },
      { key: 'status', type: 'select', set: v => handleAgreementFormChange('status', v) },
      { key: 'totalRooms', type: 'text', set: v => handleAgreementFormChange('totalRooms', v) },
      { key: 'occupancyRate', type: 'text', set: v => handleAgreementFormChange('occupancyRate', v) },
      { key: 'depositAmount', type: 'text', set: v => handleAgreementFormChange('depositAmount', v) },
      { key: 'creditDays', type: 'text', set: v => handleAgreementFormChange('creditDays', v) },
      { key: 'linenDeliveryDays', type: 'text', set: v => handleAgreementFormChange('linenDeliveryDays', v) },
      { key: 'serviceFrequency', type: 'select', set: v => handleAgreementFormChange('serviceFrequency', v) },
      { key: 'creditTermDays', type: 'text', set: v => handleAgreementFormChange('creditTermDays', v) },
      { key: 'pickupFrequencyDays', type: 'text', set: v => handleAgreementFormChange('pickupFrequencyDays', v) },
      { key: 'deliveryTatDays', type: 'text', set: v => handleAgreementFormChange('deliveryTatDays', v) },
      { key: 'discountPercentage', type: 'text', set: v => handleAgreementFormChange('discountPercentage', v) },
      { key: 'billingCycle', type: 'text', set: v => handleAgreementFormChange('billingCycle', v) },
      { key: 'billingStartDay', type: 'text', set: v => handleAgreementFormChange('billingStartDay', v) },
      { key: 'billingEndDay', type: 'text', set: v => handleAgreementFormChange('billingEndDay', v) },
      { key: 'billingType', type: 'select', set: v => handleAgreementFormChange('billingType', v) },
      { key: 'fixedMonthlyAmount', type: 'text', set: v => handleAgreementFormChange('fixedMonthlyAmount', v) },
    ],
    subForms: [
      {
        id: 'priceItem',
        add: handleAddPriceItem,
        fields: [
          { key: 'productId', type: 'select', setByIndex: (val, idx) => {
            let productId = val;
            if (typeof val === 'string') {
              const prod = products.find(p => p.name.toLowerCase() === val.toLowerCase() || p.id === val);
              if (prod) productId = prod.id;
            } else if (val && val.id) {
              productId = val.id;
            }
            handlePriceItemChange(idx, 'productId', productId);
          }},
          { key: 'quantity', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'quantity', v) },
          { key: 'price', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'price', v) },
          { key: 'serviceType', type: 'select', setByIndex: (v, i) => handlePriceItemChange(i, 'serviceType', v) },
          { key: 'remarks', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'remarks', v) },
        ],
      },
    ],
    clearAll: resetAgreementForm,
  }, isAgreementDialogOpen);
}
