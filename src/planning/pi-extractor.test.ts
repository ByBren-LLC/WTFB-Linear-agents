import { PIExtractor, ParsedElement, DocumentSection } from './pi-extractor';

describe('PIExtractor', () => {
  // Sample document and sections for testing
  const sampleDocument: ParsedElement[] = [
    {
      type: 'heading',
      content: 'Program Increment PI-2023-Q1',
      level: 1
    },
    {
      type: 'paragraph',
      content: 'This is the first Program Increment of 2023, running from January 1, 2023 to March 31, 2023.'
    },
    {
      type: 'heading',
      content: 'Features',
      level: 2
    },
    {
      type: 'paragraph',
      content: 'The following features will be implemented in this PI.'
    },
    {
      type: 'heading',
      content: 'Feature 1: User Authentication',
      level: 3
    },
    {
      type: 'paragraph',
      content: 'Implement user authentication using OAuth 2.0.'
    },
    {
      type: 'heading',
      content: 'PI Objectives',
      level: 2
    },
    {
      type: 'paragraph',
      content: 'The following objectives have been defined for this PI.'
    },
    {
      type: 'heading',
      content: 'Objective 1: Improve User Experience',
      level: 3
    },
    {
      type: 'paragraph',
      content: 'Improve the overall user experience. Business Value: 8/10'
    },
    {
      type: 'heading',
      content: 'PI Risks',
      level: 2
    },
    {
      type: 'paragraph',
      content: 'The following risks have been identified for this PI.'
    },
    {
      type: 'heading',
      content: 'Risk 1: Resource Constraints',
      level: 3
    },
    {
      type: 'paragraph',
      content: 'Limited resources may impact delivery. Impact: 4/5, Likelihood: 3/5. Mitigation: Prioritize features and allocate resources accordingly.'
    }
  ];

  const sampleSections: DocumentSection[] = [
    {
      title: 'Program Increment PI-2023-Q1',
      level: 1,
      content: [
        {
          type: 'heading',
          content: 'Program Increment PI-2023-Q1',
          level: 1
        },
        {
          type: 'paragraph',
          content: 'This is the first Program Increment of 2023, running from January 1, 2023 to March 31, 2023.'
        }
      ],
      subsections: [
        {
          title: 'Features',
          level: 2,
          content: [
            {
              type: 'heading',
              content: 'Features',
              level: 2
            },
            {
              type: 'paragraph',
              content: 'The following features will be implemented in this PI.'
            }
          ],
          subsections: [
            {
              title: 'Feature 1: User Authentication',
              level: 3,
              content: [
                {
                  type: 'heading',
                  content: 'Feature 1: User Authentication',
                  level: 3
                },
                {
                  type: 'paragraph',
                  content: 'Implement user authentication using OAuth 2.0.'
                }
              ],
              subsections: []
            }
          ]
        },
        {
          title: 'PI Objectives',
          level: 2,
          content: [
            {
              type: 'heading',
              content: 'PI Objectives',
              level: 2
            },
            {
              type: 'paragraph',
              content: 'The following objectives have been defined for this PI.'
            }
          ],
          subsections: [
            {
              title: 'Objective 1: Improve User Experience',
              level: 3,
              content: [
                {
                  type: 'heading',
                  content: 'Objective 1: Improve User Experience',
                  level: 3
                },
                {
                  type: 'paragraph',
                  content: 'Improve the overall user experience. Business Value: 8/10'
                }
              ],
              subsections: []
            }
          ]
        },
        {
          title: 'PI Risks',
          level: 2,
          content: [
            {
              type: 'heading',
              content: 'PI Risks',
              level: 2
            },
            {
              type: 'paragraph',
              content: 'The following risks have been identified for this PI.'
            }
          ],
          subsections: [
            {
              title: 'Risk 1: Resource Constraints',
              level: 3,
              content: [
                {
                  type: 'heading',
                  content: 'Risk 1: Resource Constraints',
                  level: 3
                },
                {
                  type: 'paragraph',
                  content: 'Limited resources may impact delivery. Impact: 4/5, Likelihood: 3/5. Mitigation: Prioritize features and allocate resources accordingly.'
                }
              ],
              subsections: []
            }
          ]
        }
      ]
    }
  ];

  let piExtractor: PIExtractor;

  beforeEach(() => {
    piExtractor = new PIExtractor(sampleDocument, sampleSections);
  });

  describe('extractProgramIncrements', () => {
    it('should extract Program Increments from the document', () => {
      const result = piExtractor.extractProgramIncrements();

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('PI-2023-Q1');
      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].endDate).toBeInstanceOf(Date);
      expect(result[0].status).toMatch(/planning|execution|completed/);
    });
  });

  describe('extractPIFeatures', () => {
    it('should extract PI Features from the document', () => {
      const piId = 'test-pi-id';
      const result = piExtractor.extractPIFeatures(piId);

      expect(result.length).toBe(1);
      expect(result[0].piId).toBe(piId);
      expect(result[0].status).toBe('planned');
      expect(result[0].confidence).toBe(3);
    });
  });

  describe('extractPIObjectives', () => {
    it('should extract PI Objectives from the document', () => {
      const piId = 'test-pi-id';
      const teamId = 'test-team-id';
      const result = piExtractor.extractPIObjectives(piId, teamId);

      expect(result.length).toBe(1);
      expect(result[0].piId).toBe(piId);
      expect(result[0].teamId).toBe(teamId);
      expect(result[0].description).toBe('Objective 1: Improve User Experience');
      expect(result[0].businessValue).toBe(8);
      expect(result[0].status).toBe('planned');
    });
  });

  describe('extractPIRisks', () => {
    it('should extract PI Risks from the document', () => {
      const piId = 'test-pi-id';
      const result = piExtractor.extractPIRisks(piId);

      expect(result.length).toBe(1);
      expect(result[0].piId).toBe(piId);
      expect(result[0].description).toBe('Risk 1: Resource Constraints');
      expect(result[0].impact).toBe(4);
      expect(result[0].likelihood).toBe(3);
      expect(result[0].status).toBe('identified');
      expect(result[0].mitigationPlan).toBe('Prioritize features and allocate resources accordingly.');
    });
  });

  // Add more tests for private methods if needed
});
