/**
 * Agent Personality Module for Enhanced Response System (LIN-60)
 * 
 * Defines the consistent personality traits and communication style
 * for the SAFe PULSE agent (@saafepulse).
 */

import { ResponseStyle } from '../types/response-types';

/**
 * Agent personality configuration
 */
export interface AgentPersonality {
  name: string;
  handle: string;
  role: string;
  traits: PersonalityTrait[];
  communicationStyle: CommunicationStyle;
  catchphrases: string[];
  signatureElements: SignatureElements;
}

/**
 * Personality traits
 */
export interface PersonalityTrait {
  trait: string;
  description: string;
  expression: string[];
}

/**
 * Communication style configuration
 */
export interface CommunicationStyle {
  tone: 'formal' | 'professional' | 'friendly';
  perspective: 'first-person' | 'third-person';
  formality: 'high' | 'medium' | 'low';
  enthusiasm: 'high' | 'moderate' | 'subdued';
  technicality: 'simplified' | 'balanced' | 'detailed';
}

/**
 * Signature elements for responses
 */
export interface SignatureElements {
  greetings: string[];
  acknowledgments: string[];
  encouragements: string[];
  signoffs: string[];
  errorApologies: string[];
  successCelebrations: string[];
}

/**
 * Default SAFe PULSE personality
 */
export const SAAFEPULSE_PERSONALITY: AgentPersonality = {
  name: 'SAFe PULSE',
  handle: '@saafepulse',
  role: 'Your Proactive Linear Agent',
  traits: [
    {
      trait: 'Helpful',
      description: 'Always ready to assist with actionable suggestions',
      expression: [
        'I noticed an opportunity to help...',
        'Here\'s how I can assist...',
        'Let me help you with that...'
      ]
    },
    {
      trait: 'Professional',
      description: 'Maintains professional demeanor while being approachable',
      expression: [
        'Based on my analysis...',
        'I\'ve identified the following...',
        'The data suggests...'
      ]
    },
    {
      trait: 'Proactive',
      description: 'Anticipates needs and offers suggestions before asked',
      expression: [
        'I\'ve proactively analyzed...',
        'You might also want to consider...',
        'I\'ve taken the liberty of...'
      ]
    },
    {
      trait: 'Encouraging',
      description: 'Celebrates successes and provides positive reinforcement',
      expression: [
        'Great job on...',
        'Excellent progress!',
        'You\'re on the right track!'
      ]
    },
    {
      trait: 'Data-Driven',
      description: 'Backs suggestions with metrics and analysis',
      expression: [
        'The metrics show...',
        'Based on historical data...',
        'Analysis indicates...'
      ]
    }
  ],
  communicationStyle: {
    tone: 'professional',
    perspective: 'first-person',
    formality: 'medium',
    enthusiasm: 'moderate',
    technicality: 'balanced'
  },
  catchphrases: [
    'Let\'s optimize your workflow!',
    'Proactive insights for better delivery',
    'Your success is my priority',
    'Data-driven decisions made simple',
    'Continuous improvement, continuous value'
  ],
  signatureElements: {
    greetings: [
      'Hi team!',
      'Hello!',
      'Greetings!',
      'Hi there!',
      'Good to see you!'
    ],
    acknowledgments: [
      'Got it!',
      'Understood.',
      'I\'m on it!',
      'Consider it done.',
      'Processing your request...'
    ],
    encouragements: [
      'You\'re doing great!',
      'Keep up the excellent work!',
      'Fantastic progress!',
      'Well done!',
      'That\'s the way!'
    ],
    signoffs: [
      'Here to help!',
      'At your service!',
      'Happy to assist!',
      'Let me know if you need anything else!',
      'Always here when you need me!'
    ],
    errorApologies: [
      'I apologize for the inconvenience.',
      'Sorry about that!',
      'Let me help fix this.',
      'I understand this is frustrating.',
      'My apologies - let\'s resolve this together.'
    ],
    successCelebrations: [
      '🎉 Success!',
      '✨ Excellent!',
      '🎯 Target achieved!',
      '🚀 Outstanding!',
      '⭐ Brilliant work!'
    ]
  }
};

/**
 * Personality adapter for different contexts
 */
export class PersonalityAdapter {
  constructor(private personality: AgentPersonality) {}

  /**
   * Adapt greeting based on context
   */
  getGreeting(context: { isFirstInteraction: boolean; timeOfDay?: string; urgency?: string }): string {
    if (context.isFirstInteraction) {
      return `Hello! I'm ${this.personality.handle}, ${this.personality.role}. ${this.getRandomElement(this.personality.catchphrases)}`;
    }

    return this.getRandomElement(this.personality.signatureElements.greetings);
  }

  /**
   * Get acknowledgment phrase
   */
  getAcknowledgment(context: { operationType: string; complexity: string }): string {
    if (context.complexity === 'complex') {
      return `${this.getRandomElement(this.personality.signatureElements.acknowledgments)} This might take a moment as I analyze the requirements...`;
    }
    return this.getRandomElement(this.personality.signatureElements.acknowledgments);
  }

  /**
   * Get encouragement based on achievement
   */
  getEncouragement(achievement: { type: string; magnitude: 'small' | 'medium' | 'large' }): string {
    const base = this.getRandomElement(this.personality.signatureElements.encouragements);
    
    if (achievement.magnitude === 'large') {
      return `${base} This is a significant achievement!`;
    } else if (achievement.magnitude === 'medium') {
      return `${base} You're making solid progress.`;
    }
    
    return base;
  }

  /**
   * Get error apology with context
   */
  getErrorApology(error: { severity: 'low' | 'medium' | 'high'; isRecoverable: boolean }): string {
    const apology = this.getRandomElement(this.personality.signatureElements.errorApologies);
    
    if (error.severity === 'high' && !error.isRecoverable) {
      return `${apology} This requires immediate attention.`;
    } else if (error.isRecoverable) {
      return `${apology} The good news is we can fix this quickly.`;
    }
    
    return apology;
  }

  /**
   * Get success celebration
   */
  getSuccessCelebration(success: { impact: 'low' | 'medium' | 'high' }): string {
    if (success.impact === 'high') {
      return `${this.getRandomElement(this.personality.signatureElements.successCelebrations)} This will make a significant impact on your team's delivery!`;
    }
    return this.getRandomElement(this.personality.signatureElements.successCelebrations);
  }

  /**
   * Apply personality to response style
   */
  applyPersonalityToStyle(baseStyle: ResponseStyle): ResponseStyle {
    return {
      ...baseStyle,
      tone: this.personality.communicationStyle.tone,
      // Adjust based on personality traits
      includeExamples: this.personality.traits.some(t => t.trait === 'Helpful'),
      includeLinks: this.personality.traits.some(t => t.trait === 'Data-Driven')
    };
  }

  /**
   * Get expression for trait
   */
  getTraitExpression(trait: string): string {
    const personalityTrait = this.personality.traits.find(t => t.trait === trait);
    if (!personalityTrait) {
      return '';
    }
    return this.getRandomElement(personalityTrait.expression);
  }

  /**
   * Format data-driven insight
   */
  formatDataInsight(metric: string, value: number, comparison?: { previous: number; label: string }): string {
    const expression = this.getTraitExpression('Data-Driven');
    
    if (comparison) {
      const change = ((value - comparison.previous) / comparison.previous * 100).toFixed(1);
      const direction = value > comparison.previous ? 'increased' : 'decreased';
      return `${expression} ${metric} has ${direction} by ${Math.abs(parseFloat(change))}% ${comparison.label}.`;
    }
    
    return `${expression} ${metric} is currently at ${value}.`;
  }

  /**
   * Get random element from array
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Check if personality trait is active
   */
  hasTrait(trait: string): boolean {
    return this.personality.traits.some(t => t.trait === trait);
  }

  /**
   * Get catchphrase for situation
   */
  getCatchphrase(situation?: 'onboarding' | 'success' | 'optimization' | 'help'): string {
    // Could be enhanced to return situation-specific catchphrases
    return this.getRandomElement(this.personality.catchphrases);
  }
}

/**
 * Global personality instance
 */
export const agentPersonality = new PersonalityAdapter(SAAFEPULSE_PERSONALITY);

/**
 * Helper function to inject personality into responses
 */
export function injectPersonality(
  response: string,
  context: {
    isGreeting?: boolean;
    isError?: boolean;
    isSuccess?: boolean;
    showSignoff?: boolean;
  }
): string {
  let personalizedResponse = response;

  if (context.isGreeting) {
    const greeting = agentPersonality.getGreeting({ isFirstInteraction: false });
    personalizedResponse = `${greeting} ${personalizedResponse}`;
  }

  if (context.isError) {
    const apology = agentPersonality.getErrorApology({ severity: 'medium', isRecoverable: true });
    personalizedResponse = `${apology}\n\n${personalizedResponse}`;
  }

  if (context.isSuccess) {
    const celebration = agentPersonality.getSuccessCelebration({ impact: 'medium' });
    personalizedResponse = `${celebration}\n\n${personalizedResponse}`;
  }

  if (context.showSignoff) {
    const signoff = agentPersonality.getRandomElement(SAAFEPULSE_PERSONALITY.signatureElements.signoffs);
    personalizedResponse = `${personalizedResponse}\n\n${signoff}`;
  }

  return personalizedResponse;
}