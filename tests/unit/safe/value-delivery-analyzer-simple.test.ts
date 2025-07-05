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

  describe('comprehensive configuration testing', () => {
    it('should handle all configuration properties', () => {
      const fullConfig = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.9,
        minWorkingSoftwareRatio: 0.95,
        maxValueRiskScore: 0.1,
        valueStreamPriorities: new Map([
          ['customer-facing', 1.0],
          ['revenue-generating', 0.9],
          ['efficiency-improving', 0.7],
          ['technical-debt', 0.5],
          ['infrastructure', 0.6]
        ])
      });
      expect(fullConfig).toBeDefined();
    });

    it('should handle edge case configuration values', () => {
      const edgeConfig1 = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.0,
        minWorkingSoftwareRatio: 0.0,
        maxValueRiskScore: 1.0
      });
      
      const edgeConfig2 = new ValueDeliveryAnalyzer({
        minValueConfidence: 1.0,
        minWorkingSoftwareRatio: 1.0,
        maxValueRiskScore: 0.0
      });

      expect(edgeConfig1).toBeDefined();
      expect(edgeConfig2).toBeDefined();
    });

    it('should handle empty Map configuration', () => {
      const emptyMapConfig = new ValueDeliveryAnalyzer({
        valueStreamPriorities: new Map()
      });
      expect(emptyMapConfig).toBeDefined();
    });

    it('should handle configuration with single value stream priority', () => {
      const singleStreamConfig = new ValueDeliveryAnalyzer({
        valueStreamPriorities: new Map([['customer-facing', 1.0]])
      });
      expect(singleStreamConfig).toBeDefined();
    });
  });

  describe('multiple instantiation patterns', () => {
    it('should create multiple instances independently', () => {
      const analyzer1 = new ValueDeliveryAnalyzer({ minValueConfidence: 0.7 });
      const analyzer2 = new ValueDeliveryAnalyzer({ minValueConfidence: 0.8 });
      const analyzer3 = new ValueDeliveryAnalyzer({ minValueConfidence: 0.9 });

      expect(analyzer1).toBeDefined();
      expect(analyzer2).toBeDefined(); 
      expect(analyzer3).toBeDefined();
      expect(analyzer1).not.toBe(analyzer2);
      expect(analyzer2).not.toBe(analyzer3);
    });

    it('should handle rapid instantiation', () => {
      const analyzers = [];
      for (let i = 0; i < 5; i++) {
        analyzers.push(new ValueDeliveryAnalyzer({
          minValueConfidence: 0.5 + (i * 0.1),
          minWorkingSoftwareRatio: 0.6 + (i * 0.08)
        }));
      }
      
      expect(analyzers.length).toBe(5);
      analyzers.forEach(analyzer => {
        expect(analyzer).toBeDefined();
        expect(analyzer).toBeInstanceOf(ValueDeliveryAnalyzer);
      });
    });
  });
});