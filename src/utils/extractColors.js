export function extractColors(shopifyResponse) {
  const variants = shopifyResponse?.data?.product?.variants?.edges || [];

  const colorSet = new Set();

  for (const edge of variants) {
    const selectedOptions = edge?.node?.selectedOptions || [];

    const colorOption = selectedOptions.find(
      (option) => option.name === "Color"
    );

    if (colorOption?.value) {
      colorSet.add(colorOption.value);
    }
  }

  return Array.from(colorSet);
}