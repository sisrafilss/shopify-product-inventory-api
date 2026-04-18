import { fetchProductInventory } from '../utils/shopifyClient.js';
import { sendResponse } from '../utils/sendResponse.js';
import { extractColors } from '../utils/extractColors.js';
import { getVariantsByColor } from '../utils/getVariantsByColor.js';

export const getProductInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { colorName } = req.query;

    // -------------------------------
    // 1. Validate product ID
    // -------------------------------
    if (!id) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Product ID is required",
        data: null,
      });
    }

    const productId = `gid://shopify/Product/${id}`;

    // -------------------------------
    // 2. Fetch data from Shopify
    // -------------------------------
    const result = await fetchProductInventory(productId);

    if (!result || !result.data || !result.data.product) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    // -------------------------------
    // 3. Handle Shopify GraphQL errors
    // -------------------------------
    if (result?.data?.errors?.length) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: result.data.errors[0].message || "GraphQL error",
        data: null,
      });
    }

    // -------------------------------
    // 4. Extract all colors
    // -------------------------------
    const colors = extractColors(result);

    let responseData;

    // -------------------------------
    // 5. If NO color filter → return everything
    // -------------------------------
    if (!colorName) {
      responseData = {
        product: result.data.product,
        colors,
      };
    }

    // -------------------------------
    // 6. If color is provided → filter
    // -------------------------------
    else {
      const matchedColor = colors.find(
        (c) => c.toLowerCase() === colorName.toLowerCase()
      );

      if (!matchedColor) {
        return sendResponse(res, {
          statusCode: 404,
          success: false,
          message: `Color '${colorName}' not found for this product`,
          data: {
            availableColors: colors,
          },
        });
      }

      const filteredVariants = getVariantsByColor(result, matchedColor);

      responseData = {
        productTitle: result.data.product.title,
        color: matchedColor,
        variants: filteredVariants,
      };
    }

    // -------------------------------
    // 7. Final response
    // -------------------------------
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product inventory fetched successfully",
      data: responseData,
    });

  } catch (error) {
    // extra safety (even if global handler exists)
    console.error("getProductInventory error:", error);
    next(error);
  }
};