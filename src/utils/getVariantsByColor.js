export function getVariantsByColor(shopifyResponse, colorName) {
  const variants = shopifyResponse?.data?.product?.variants?.edges || [];

  const result = [];

  for (const edge of variants) {
    const node = edge?.node;
    const selectedOptions = node?.selectedOptions || [];

    const colorOption = selectedOptions.find(
      (option) => option.name === "Color"
    );

    if (colorOption?.value === colorName) {
      result.push(node);
    }
  }

  return result;
}