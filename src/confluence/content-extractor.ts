/**
 * Content extractor for Confluence documents
 * 
 * This module provides utilities for extracting plain text from parsed elements
 * and searching within parsed content.
 */

import * as logger from '../utils/logger';
import { ParsedElement } from './parser';

/**
 * Extracts plain text from a parsed element
 * 
 * @param element - The parsed element
 * @returns The plain text content of the element
 */
export const extractText = (element: ParsedElement): string => {
  if (typeof element.content === 'string') {
    return element.content;
  }
  
  if (Array.isArray(element.content)) {
    return element.content.map(extractText).join(' ');
  }
  
  return '';
};

/**
 * Extracts plain text from an array of parsed elements
 * 
 * @param elements - The parsed elements
 * @returns The plain text content of the elements
 */
export const extractTextFromElements = (elements: ParsedElement[]): string => {
  return elements.map(extractText).join('\n');
};

/**
 * Finds elements by type
 * 
 * @param elements - The parsed elements to search
 * @param type - The type of elements to find
 * @returns An array of parsed elements of the specified type
 */
export const findElementsByType = (elements: ParsedElement[], type: string): ParsedElement[] => {
  const result: ParsedElement[] = [];
  
  const findInElement = (element: ParsedElement) => {
    if (element.type === type) {
      result.push(element);
    }
    
    if (Array.isArray(element.content)) {
      element.content.forEach(findInElement);
    }
  };
  
  elements.forEach(findInElement);
  
  return result;
};

/**
 * Finds elements by content
 * 
 * @param elements - The parsed elements to search
 * @param content - The content to search for
 * @param options - Search options
 * @returns An array of parsed elements containing the specified content
 */
export const findElementsByContent = (
  elements: ParsedElement[], 
  content: string, 
  options: { caseSensitive?: boolean; exactMatch?: boolean } = {}
): ParsedElement[] => {
  const result: ParsedElement[] = [];
  const { caseSensitive = false, exactMatch = false } = options;
  
  const searchContent = caseSensitive ? content : content.toLowerCase();
  
  const findInElement = (element: ParsedElement) => {
    if (typeof element.content === 'string') {
      const elementContent = caseSensitive ? element.content : element.content.toLowerCase();
      
      if (exactMatch ? elementContent === searchContent : elementContent.includes(searchContent)) {
        result.push(element);
      }
    } else if (Array.isArray(element.content)) {
      // Check if any child element contains the content
      let containsContent = false;
      
      element.content.forEach(child => {
        if (findInElement(child)) {
          containsContent = true;
        }
      });
      
      if (containsContent) {
        result.push(element);
      }
    }
    
    return result.includes(element);
  };
  
  elements.forEach(findInElement);
  
  return result;
};

/**
 * Finds elements by attribute
 * 
 * @param elements - The parsed elements to search
 * @param attributeName - The name of the attribute to search for
 * @param attributeValue - The value of the attribute to search for
 * @param options - Search options
 * @returns An array of parsed elements with the specified attribute
 */
export const findElementsByAttribute = (
  elements: ParsedElement[], 
  attributeName: string, 
  attributeValue?: string, 
  options: { caseSensitive?: boolean; exactMatch?: boolean } = {}
): ParsedElement[] => {
  const result: ParsedElement[] = [];
  const { caseSensitive = false, exactMatch = false } = options;
  
  const findInElement = (element: ParsedElement) => {
    if (element.attributes) {
      if (attributeValue === undefined) {
        // Just check if the attribute exists
        if (attributeName in element.attributes) {
          result.push(element);
        }
      } else {
        // Check if the attribute has the specified value
        const attrValue = element.attributes[attributeName];
        
        if (attrValue !== undefined) {
          const searchValue = caseSensitive ? attributeValue : attributeValue.toLowerCase();
          const elementValue = caseSensitive ? attrValue : attrValue.toLowerCase();
          
          if (exactMatch ? elementValue === searchValue : elementValue.includes(searchValue)) {
            result.push(element);
          }
        }
      }
    }
    
    if (Array.isArray(element.content)) {
      element.content.forEach(findInElement);
    }
  };
  
  elements.forEach(findInElement);
  
  return result;
};

/**
 * Extracts a summary from a document
 * 
 * @param elements - The parsed elements
 * @param maxLength - The maximum length of the summary
 * @returns A summary of the document
 */
export const extractSummary = (elements: ParsedElement[], maxLength: number = 200): string => {
  try {
    // First, try to find the first paragraph
    const paragraphs = findElementsByType(elements, 'p');
    
    if (paragraphs.length > 0) {
      const firstParagraph = extractText(paragraphs[0]);
      
      if (firstParagraph.length <= maxLength) {
        return firstParagraph;
      }
      
      return firstParagraph.substring(0, maxLength) + '...';
    }
    
    // If no paragraphs, extract text from the first few elements
    const allText = extractTextFromElements(elements);
    
    if (allText.length <= maxLength) {
      return allText;
    }
    
    return allText.substring(0, maxLength) + '...';
  } catch (error) {
    logger.error('Failed to extract summary', { error });
    return '';
  }
};
