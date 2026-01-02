/**
 * Markdown module for Lumio
 *
 * Provides shared configuration and utilities for markdown rendering
 * across web and mobile apps.
 */

export {
  remarkPlugins,
  rehypePlugins,
  markdownConfig,
} from './config';

export {
  parseGitHubUrl,
  toGitHubRawUrl,
  createImageUrlTransformer,
  isImageUrl,
  SUPPORTED_IMAGE_EXTENSIONS,
} from './utils';
