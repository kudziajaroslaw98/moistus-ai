export { TextElement, textElementType } from './text-element';
export { ImageElement, imageElementType } from './image-element';
export { VideoElement, videoElementType } from './video-element';
export { StatusElement, statusElementType } from './status-element';
export { TagElement, tagElementType } from './tag-element';

import { ElementType } from '@/types/builder-node';
import { 
  textElementType, 
  imageElementType, 
  videoElementType, 
  statusElementType, 
  tagElementType 
} from './';

export const elementTypes: ElementType[] = [
  textElementType,
  imageElementType,
  videoElementType,
  statusElementType,
  tagElementType,
];
