/**
 * Pattern recognition for planning items.
 * This module contains functions for recognizing different types of planning items.
 */

import * as logger from '../utils/logger';
import { ConfluenceElement, ConfluenceSection } from '../confluence/parser';

/**
 * Checks if a section represents an epic.
 * @param section The document section to check
 * @returns True if the section represents an epic, false otherwise
 */
export const isEpicSection = (section: ConfluenceSection): boolean => {
  // Check if the section title contains "Epic" or has specific epic markers
  const titleLower = section.title.toLowerCase();

  // Epic patterns
  const epicPatterns = [
    /\bepic\b/i,
    /\bepic:/i,
    /^e\d+:/i, // E1:, E2:, etc.
  ];

  // Check if any pattern matches
  return epicPatterns.some(pattern => pattern.test(titleLower)) ||
    // Check if the section has a specific level (usually level 1 or 2)
    (section.level === 1 && !isFeatureSection(section) && !isStorySection(section) && !isEnablerSection(section));
};

/**
 * Checks if a section represents a feature.
 * @param section The document section to check
 * @returns True if the section represents a feature, false otherwise
 */
export const isFeatureSection = (section: ConfluenceSection): boolean => {
  // Check if the section title contains "Feature" or has specific feature markers
  const titleLower = section.title.toLowerCase();

  // Feature patterns
  const featurePatterns = [
    /\bfeature\b/i,
    /\bfeature:/i,
    /^f\d+:/i, // F1:, F2:, etc.
  ];

  // Check if any pattern matches
  return featurePatterns.some(pattern => pattern.test(titleLower)) ||
    // Check if the section has a specific level (usually level 2 or 3)
    (section.level === 2 && !isEpicSection(section) && !isStorySection(section) && !isEnablerSection(section));
};

/**
 * Checks if a section represents a story.
 * @param section The document section to check
 * @returns True if the section represents a story, false otherwise
 */
export const isStorySection = (section: ConfluenceSection): boolean => {
  // Check if the section title contains "Story" or has specific story markers
  const titleLower = section.title.toLowerCase();

  // Story patterns
  const storyPatterns = [
    /\bstory\b/i,
    /\buser story\b/i,
    /\bstory:/i,
    /^s\d+:/i, // S1:, S2:, etc.
    /\bas a\b.*\bi want\b.*\bso that\b/i, // As a... I want... So that...
  ];

  // Check if any pattern matches
  return storyPatterns.some(pattern => pattern.test(titleLower)) ||
    // Check if the section has a specific level (usually level 3 or 4)
    (section.level === 3 && !isEpicSection(section) && !isFeatureSection(section) && !isEnablerSection(section));
};

/**
 * Checks if a section represents an enabler.
 * @param section The document section to check
 * @returns True if the section represents an enabler, false otherwise
 */
export const isEnablerSection = (section: ConfluenceSection): boolean => {
  // Check if the section title contains "Enabler" or has specific enabler markers
  const titleLower = section.title.toLowerCase();

  // Enabler patterns
  const enablerPatterns = [
    /\benabler\b/i,
    /\benabler:/i,
    /\btechnical debt\b/i,
    /\barchitecture\b/i,
    /\binfrastructure\b/i,
    /\bresearch\b/i,
    /^e\d+:/i, // E1:, E2:, etc. (may conflict with epic pattern)
  ];

  // Check if any pattern matches
  return enablerPatterns.some(pattern => pattern.test(titleLower));
};

/**
 * Determines the enabler type from a section.
 * @param section The document section
 * @returns The enabler type
 */
export const determineEnablerType = (section: ConfluenceSection): 'architecture' | 'infrastructure' | 'technical_debt' | 'research' => {
  const titleLower = section.title.toLowerCase();
  const contentText = extractTextFromElements(section.elements);

  if (titleLower.includes('architecture') || contentText.includes('architecture')) {
    return 'architecture';
  } else if (titleLower.includes('infrastructure') || contentText.includes('infrastructure')) {
    return 'infrastructure';
  } else if (titleLower.includes('technical debt') || contentText.includes('technical debt')) {
    return 'technical_debt';
  } else if (titleLower.includes('research') || contentText.includes('research')) {
    return 'research';
  }

  // Default to architecture if no specific type is found
  return 'architecture';
};

/**
 * Extracts acceptance criteria from a section.
 * @param section The document section
 * @returns Array of acceptance criteria
 */
export const extractAcceptanceCriteria = (section: ConfluenceSection): string[] => {
  const acceptanceCriteria: string[] = [];

  // Look for acceptance criteria in the section content
  const contentText = extractTextFromElements(section.elements);

  // Look for acceptance criteria section
  const acSectionMatch = contentText.match(/acceptance criteria:?([\s\S]*?)(?=\n\s*\n|\n\s*#|\n\s*\*\*|\n\s*-|\n\s*\d+\.|\n\s*\[|\n\s*\{|\n\s*<|\n\s*$)/i);

  if (acSectionMatch && acSectionMatch[1]) {
    // Split by newlines and bullet points
    const acLines = acSectionMatch[1].split(/\n\s*[-*•]|\n\s*\d+\./).filter(Boolean);

    // Clean up each line
    acLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        acceptanceCriteria.push(trimmedLine);
      }
    });
  }

  // Look for bullet points that might be acceptance criteria
  const bulletPointMatches = contentText.match(/\n\s*[-*•].*|\n\s*\d+\..*/g);

  if (bulletPointMatches) {
    bulletPointMatches.forEach(match => {
      const trimmedMatch = match.trim().replace(/^[-*•]\s*|\d+\.\s*/, '');

      // Check if it looks like an acceptance criterion
      if (
        trimmedMatch.toLowerCase().includes('should') ||
        trimmedMatch.toLowerCase().includes('must') ||
        trimmedMatch.toLowerCase().includes('will') ||
        trimmedMatch.toLowerCase().includes('can')
      ) {
        acceptanceCriteria.push(trimmedMatch);
      }
    });
  }

  return acceptanceCriteria;
};

/**
 * Extracts story points from a section.
 * @param section The document section
 * @returns Story points or undefined if not found
 */
export const extractStoryPoints = (section: ConfluenceSection): number | undefined => {
  // Look for story points in the section title and content
  const titleLower = section.title.toLowerCase();
  const contentText = extractTextFromElements(section.elements);

  // Story points patterns
  const storyPointsPatterns = [
    /(\d+)\s*(?:story\s*points?|sp|points?)/i,
    /story\s*points?:?\s*(\d+)/i,
    /sp:?\s*(\d+)/i,
    /points?:?\s*(\d+)/i,
    /effort:?\s*(\d+)/i,
    /estimate:?\s*(\d+)/i,
  ];

  // Check title first
  for (const pattern of storyPointsPatterns) {
    const match = titleLower.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Then check content
  for (const pattern of storyPointsPatterns) {
    const match = contentText.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
};

/**
 * Extracts attributes from a section.
 * @param section The document section
 * @returns Record of attributes
 */
export const extractAttributes = (section: ConfluenceSection): Record<string, any> => {
  const attributes: Record<string, any> = {};
  const contentText = extractTextFromElements(section.elements);

  // Look for key-value pairs in the content
  const keyValuePairs = contentText.match(/([A-Za-z][A-Za-z0-9_]*):?\s*([^,\n]*)/g);

  if (keyValuePairs) {
    keyValuePairs.forEach(pair => {
      const [key, value] = pair.split(/:\s*/);
      if (key && value) {
        attributes[key.trim().toLowerCase()] = value.trim();
      }
    });
  }

  // Look for labels
  const labelsMatch = contentText.match(/labels?:?\s*([^,\n]*)/i);
  if (labelsMatch && labelsMatch[1]) {
    attributes.labels = labelsMatch[1].trim().split(/\s*,\s*/);
  }

  // Look for priority
  const priorityMatch = contentText.match(/priority:?\s*([^,\n]*)/i);
  if (priorityMatch && priorityMatch[1]) {
    attributes.priority = priorityMatch[1].trim();
  }

  return attributes;
};

/**
 * Extracts text from a parsed element.
 * @param element The parsed element
 * @returns The extracted text
 */
export const extractText = (element: ConfluenceElement): string => {
  if (element.content) {
    return element.content;
  } else if (element.children && element.children.length > 0) {
    return element.children.map(extractText).join(' ');
  }
  return '';
};

/**
 * Extracts text from an array of parsed elements.
 * @param elements The parsed elements
 * @returns The extracted text
 */
export const extractTextFromElements = (elements: ConfluenceElement[]): string => {
  return elements.map(extractText).join('\n');
};
