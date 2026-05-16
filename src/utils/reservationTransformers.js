export function reservationTransformers(reservations = []) {
  return reservations.map((reservation) => {
    const summary = reservation.items?.reduce(
      (acc, item) => {
        acc.products += 1;
        acc.totalAllocatted += item.totalReservedQuantity || 0;
        acc.allocatedWarehouse += item.quantityAllocatedWithDC || 0;
        acc.allocatedCustomer += item.quantityAllocatedWithCustomer || 0;
        acc.currentWithWarehouse += item.currentQuantityWithDC || 0;
        acc.currentWithCustomer += item.currentQuantityWithCustomer || 0;
        return acc;
      },
      {
        products: 0,
        totalAllocatted: 0,
        allocatedWarehouse: 0,
        allocatedCustomer: 0,
        currentWithWarehouse: 0,
        currentWithCustomer: 0,
      }
    );

    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: reservation.customerName,
      reservationDate: reservation.reservationDate,
      reservationType: reservation.reservationType,
      items: reservation.items || [],
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      notes: reservation.notes,
      poolId: reservation.poolId,
      status: reservation.status,
      ...summary,
    };
  });
}
