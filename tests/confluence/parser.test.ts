import { ConfluenceParser, ParsedElement } from '../../src/confluence/parser';

describe('ConfluenceParser', () => {
  describe('constructor', () => {
    it('should create a new parser instance', () => {
      const parser = new ConfluenceParser('<body><p>Test</p></body>');
      expect(parser).toBeInstanceOf(ConfluenceParser);
    });

    it('should throw an error for invalid input', () => {
      expect(() => new ConfluenceParser('')).toThrow();
    });
  });

  describe('getFullContent', () => {
    it('should return the full content of the document', () => {
      const parser = new ConfluenceParser('<body><p>Test</p></body>');
      const content = parser.getFullContent();
      expect(content).toBeInstanceOf(Array);
      expect(content.length).toBe(1);
      expect(content[0].type).toBe('p');
      expect(content[0].content).toBe('Test');
    });
  });

  describe('getHeadings', () => {
    it('should return all headings in the document', () => {
      const parser = new ConfluenceParser('<body><h1>Heading 1</h1><p>Paragraph</p><h2>Heading 2</h2></body>');
      const headings = parser.getHeadings();
      expect(headings).toBeInstanceOf(Array);
      expect(headings.length).toBe(2);
      expect(headings[0].type).toBe('h1');
      expect(headings[0].content).toBe('Heading 1');
      expect(headings[1].type).toBe('h2');
      expect(headings[1].content).toBe('Heading 2');
    });
  });

  describe('getParagraphs', () => {
    it('should return all paragraphs in the document', () => {
      const parser = new ConfluenceParser('<body><h1>Heading</h1><p>Paragraph 1</p><p>Paragraph 2</p></body>');
      const paragraphs = parser.getParagraphs();
      expect(paragraphs).toBeInstanceOf(Array);
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0].type).toBe('p');
      expect(paragraphs[0].content).toBe('Paragraph 1');
      expect(paragraphs[1].type).toBe('p');
      expect(paragraphs[1].content).toBe('Paragraph 2');
    });
  });

  describe('getTables', () => {
    it('should return all tables in the document', () => {
      const parser = new ConfluenceParser(`
        <body>
          <table>
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </table>
        </body>
      `);
      const tables = parser.getTables();
      expect(tables).toBeInstanceOf(Array);
      expect(tables.length).toBe(1);
      expect(tables[0].type).toBe('table');
      expect(Array.isArray(tables[0].content)).toBe(true);
    });
  });

  describe('getLists', () => {
    it('should return all lists in the document', () => {
      const parser = new ConfluenceParser(`
        <body>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <ol>
            <li>Item 1</li>
            <li>Item 2</li>
          </ol>
        </body>
      `);
      const lists = parser.getLists();
      expect(lists).toBeInstanceOf(Array);
      expect(lists.length).toBe(2);
      expect(lists[0].type).toBe('ul');
      expect(lists[1].type).toBe('ol');
    });
  });

  describe('getLinks', () => {
    it('should return all links in the document', () => {
      const parser = new ConfluenceParser(`
        <body>
          <p>This is a <a href="https://example.com">link</a></p>
        </body>
      `);
      const links = parser.getLinks();
      expect(links).toBeInstanceOf(Array);
      expect(links.length).toBe(1);
      expect(links[0].type).toBe('a');
      expect(links[0].content).toBe('link');
      expect(links[0].attributes?.href).toBe('https://example.com');
    });
  });

  describe('getImages', () => {
    it('should return all images in the document', () => {
      const parser = new ConfluenceParser(`
        <body>
          <p>This is an <img src="image.jpg" alt="image"></p>
        </body>
      `);
      const images = parser.getImages();
      expect(images).toBeInstanceOf(Array);
      expect(images.length).toBe(1);
      expect(images[0].type).toBe('img');
      expect(images[0].attributes?.src).toBe('image.jpg');
      expect(images[0].attributes?.alt).toBe('image');
    });
  });

  describe('getMacros', () => {
    it('should return all macros in the document', () => {
      const parser = new ConfluenceParser(`
        <body>
          <ac:structured-macro ac:name="info">
            <ac:parameter ac:name="title">Info</ac:parameter>
            <ac:rich-text-body>
              <p>This is an info macro</p>
            </ac:rich-text-body>
          </ac:structured-macro>
        </body>
      `);
      const macros = parser.getMacros();
      expect(macros).toBeInstanceOf(Array);
      expect(macros.length).toBe(1);
      expect(macros[0].type).toBe('macro');
      expect(macros[0].attributes?.name).toBe('info');
    });
  });
});
