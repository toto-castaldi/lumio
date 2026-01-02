/**
 * Markdown utilities for Lumio
 *
 * Helper functions for handling markdown content, especially images.
 */

/**
 * Parse a GitHub repository URL to extract owner and repo name
 * @param repoUrl - Full GitHub repository URL (e.g., https://github.com/owner/repo)
 * @returns Object with owner and repo, or null if not a valid GitHub URL
 */
export function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } | null {
  // Match GitHub URLs: https://github.com/owner/repo or https://github.com/owner/repo.git
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/**
 * Convert a relative image path to a GitHub raw URL
 * @param imagePath - Relative path to the image (e.g., /assets/img/diagram.png or ../assets/img.png)
 * @param repoUrl - Full GitHub repository URL
 * @param branch - Branch name (default: 'main')
 * @returns Full GitHub raw URL, or the original path if conversion fails
 */
export function toGitHubRawUrl(
  imagePath: string,
  repoUrl: string,
  branch: string = 'main'
): string {
  // If already an absolute URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    // Not a GitHub URL, return original path
    return imagePath;
  }

  // Clean up the path: remove leading slashes and normalize
  const cleanPath = imagePath.replace(/^\/+/, '').replace(/^\.\.\/+/, '');

  // Construct GitHub raw URL
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${cleanPath}`;
}

/**
 * Create an image URL transformer function for a specific repository
 * @param repoUrl - Full GitHub repository URL
 * @param branch - Branch name (default: 'main')
 * @returns Function that transforms relative paths to absolute URLs
 */
export function createImageUrlTransformer(
  repoUrl: string,
  branch: string = 'main'
): (src: string) => string {
  return (src: string) => toGitHubRawUrl(src, repoUrl, branch);
}

/**
 * Supported image extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

/**
 * Check if a URL points to an image based on extension
 * @param url - URL or path to check
 * @returns true if the URL has a supported image extension
 */
export function isImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
}
