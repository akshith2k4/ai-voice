import React from "react";
import CustomDrawer from "../../common/CustomDrawer";
import WashRequestDetails from "./WashRequestDetails";

function WashRequestDrawer({ request, onClose }) {
  return (
    <CustomDrawer
      open={Boolean(request)}
      onClose={onClose}
      width={750}
    >
      <WashRequestDetails request={request} onClose={onClose} />
    </CustomDrawer>
  );
}

export default WashRequestDrawer;
