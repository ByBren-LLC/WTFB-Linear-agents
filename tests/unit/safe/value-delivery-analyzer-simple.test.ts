/**
 * Simple Tests for ValueDeliveryAnalyzer (LIN-49)
 * Focus on constructor and basic functionality
 */

import { ValueDeliveryAnalyzer } from '../../../src/safe/value-delivery-analyzer';

describe('ValueDeliveryAnalyzer Simple Tests', () => {
  let analyzer: ValueDeliveryAnalyzer;

  beforeEach(() => {
    analyzer = new ValueDeliveryAnalyzer();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(ValueDeliveryAnalyzer);
    });

    it('should accept custom configuration', () => {
      const customAnalyzer = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.9,
        minWorkingSoftwareRatio: 0.95
      });
      expect(customAnalyzer).toBeDefined();
    });

    it('should use default configuration when no config provided', () => {
      const defaultAnalyzer = new ValueDeliveryAnalyzer();
      expect(defaultAnalyzer).toBeDefined();
    });

    it('should accept partial configuration', () => {
      const partialConfigAnalyzer = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.8
      });
      expect(partialConfigAnalyzer).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    it('should be an instance of ValueDeliveryAnalyzer', () => {
      expect(analyzer).toBeInstanceOf(ValueDeliveryAnalyzer);
    });

    it('should initialize with different config values', () => {
      const config1 = new ValueDeliveryAnalyzer({ minValueConfidence: 0.5 });
      const config2 = new ValueDeliveryAnalyzer({ minWorkingSoftwareRatio: 0.6 });
      
      expect(config1).toBeDefined();
      expect(config2).toBeDefined();
    });
  });
});