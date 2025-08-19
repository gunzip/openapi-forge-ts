import { readFileSync } from 'fs';
import YAML from 'yaml';

// Read and parse the OpenAPI spec
const yamlContent = readFileSync('test.yaml', 'utf8');
const doc = YAML.parse(yamlContent);

// Find the specific operation
const pathItem = doc.paths['/test-parameter-with-body-ref'];
const operation = pathItem.post;

console.log('Operation:', operation.operationId);
console.log('Has requestBody:', !!operation.requestBody);

if (operation.requestBody) {
  console.log('RequestBody structure:');
  console.log(JSON.stringify(operation.requestBody, null, 2));
  
  const jsonContent = operation.requestBody.content?.['application/json'];
  console.log('JSON content:', jsonContent);
  
  if (jsonContent?.schema) {
    console.log('Schema:', jsonContent.schema);
    
    if (jsonContent.schema['$ref']) {
      const typeName = jsonContent.schema['$ref'].split('/').pop();
      console.log('Extracted type name:', typeName);
    }
  }
}
