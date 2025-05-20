import { ConfluenceParser } from './parser';

// Sample Confluence storage format
const sampleContent = `
<body>
  <h1>Heading 1</h1>
  <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
  <h2>Heading 2</h2>
  <ul>
    <li>Item 1</li>
    <li>Item 2
      <ul>
        <li>Subitem 1</li>
        <li>Subitem 2</li>
      </ul>
    </li>
  </ul>
  <table>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
    </tr>
  </table>
  <p>This is a <a href="https://example.com">link</a>.</p>
  <p>This is an <img src="image.jpg" alt="image">.</p>
  <ac:structured-macro ac:name="info">
    <ac:parameter ac:name="title">Info</ac:parameter>
    <ac:rich-text-body>
      <p>This is an info macro</p>
    </ac:rich-text-body>
  </ac:structured-macro>
</body>
`;

// Create a parser instance
const parser = new ConfluenceParser(sampleContent);

// Get the full content
console.log('Full content:');
console.log(JSON.stringify(parser.getFullContent(), null, 2));

// Get headings
console.log('\nHeadings:');
console.log(JSON.stringify(parser.getHeadings(), null, 2));

// Get paragraphs
console.log('\nParagraphs:');
console.log(JSON.stringify(parser.getParagraphs(), null, 2));

// Get lists
console.log('\nLists:');
console.log(JSON.stringify(parser.getLists(), null, 2));

// Get tables
console.log('\nTables:');
console.log(JSON.stringify(parser.getTables(), null, 2));

// Get links
console.log('\nLinks:');
console.log(JSON.stringify(parser.getLinks(), null, 2));

// Get images
console.log('\nImages:');
console.log(JSON.stringify(parser.getImages(), null, 2));

// Get macros
console.log('\nMacros:');
console.log(JSON.stringify(parser.getMacros(), null, 2));
