/**
 * SHAREABLE CONTENT VALIDATION
 * 
 * Guards to prevent business pages from being shared without valid content.
 * Ensures social sharing always shows correct image, name, and description.
 */

export interface ShareableContent {
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ShareValidationResult {
  isShareable: boolean;
  missingFields: string[];
  warnings: string[];
}

/**
 * Validate if a business has all required content for social sharing
 * 
 * Requirements:
 * - Name: Required (always exists)
 * - Description: Required for meaningful sharing
 * - Image: Required, must be absolute URL, minimum 1200x630 recommended
 * 
 * @param content Business content to validate
 * @returns Validation result with shareability status and missing fields
 */
export function validateShareableContent(content: ShareableContent): ShareValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Validate name (always required)
  if (!content.name || content.name.trim().length === 0) {
    missingFields.push('name');
  }

  // Validate description (required for social sharing)
  if (!content.description || content.description.trim().length === 0) {
    missingFields.push('description');
  } else if (content.description.length < 50) {
    warnings.push('Description is very short (less than 50 characters). Consider using AI-generated description.');
  }

  // Validate image (required for social cards)
  if (!content.imageUrl || content.imageUrl.trim().length === 0) {
    missingFields.push('image');
  } else {
    // Check if image is absolute URL
    const isAbsoluteUrl = content.imageUrl.startsWith('http://') || content.imageUrl.startsWith('https://');
    if (!isAbsoluteUrl) {
      warnings.push('Image URL is relative. Social platforms require absolute URLs.');
    }

    // Check file format (should be JPG or PNG)
    const isValidFormat = /\.(jpe?g|png)$/i.test(content.imageUrl);
    if (!isValidFormat) {
      warnings.push('Image format should be JPG or PNG for best social platform compatibility.');
    }
  }

  return {
    isShareable: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Check if BusinessPage is ready for publishing and sharing
 * 
 * @param page BusinessPage data
 * @returns Validation result
 */
export function validateBusinessPageShareability(page: {
  title: string;
  aiDescription: string | null;
  heroImageUrl: string | null;
}): ShareValidationResult {
  return validateShareableContent({
    name: page.title,
    description: page.aiDescription,
    imageUrl: page.heroImageUrl,
  });
}

/**
 * Check if Business is ready for publishing and sharing (legacy)
 * 
 * @param business Business data
 * @returns Validation result
 */
export function validateBusinessShareability(business: {
  name: string;
  description: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
}): ShareValidationResult {
  return validateShareableContent({
    name: business.name,
    description: business.description,
    imageUrl: business.coverUrl || business.logoUrl || null,
  });
}

/**
 * Generate user-friendly error message for missing shareable content
 * 
 * @param result Validation result
 * @returns User-friendly error message
 */
export function getShareabilityErrorMessage(result: ShareValidationResult): string {
  if (result.isShareable) {
    return '';
  }

  const missing = result.missingFields.map(field => {
    switch (field) {
      case 'name': return 'business name';
      case 'description': return 'description';
      case 'image': return 'image';
      default: return field;
    }
  });

  if (missing.length === 1) {
    return `Cannot share: missing ${missing[0]}. Please add this information before sharing.`;
  } else if (missing.length === 2) {
    return `Cannot share: missing ${missing[0]} and ${missing[1]}. Please add this information before sharing.`;
  } else {
    return `Cannot share: missing ${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}. Please add this information before sharing.`;
  }
}
