import React from "react";
import CustomDrawer from "../../common/CustomDrawer";
import WashFulfillmentDetails from "./WashFulfillmentDetails";

function WashFulfillmentDrawer({ fulfillment, onClose }) {
  if (!fulfillment) return null;

  return (
    <CustomDrawer
      open={Boolean(fulfillment)}
      onClose={onClose}
      width={850}
    >
      <WashFulfillmentDetails fulfillment={fulfillment} onClose={onClose} />
    </CustomDrawer>
  );
}

export default WashFulfillmentDrawer;
