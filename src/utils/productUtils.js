import { equalsNormalizedString } from "./stringUtils";

export const matchesProductName = (item, selectedProduct) => {
  if (!selectedProduct) return true;
  return equalsNormalizedString(item?.productName, selectedProduct);
};

export const filterProductItems = (items, selectedProduct) =>
  (Array.isArray(items) ? items : []).filter((item) => matchesProductName(item, selectedProduct));
