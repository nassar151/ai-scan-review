import type { FunctionTool } from 'openai/resources/responses/responses';
import { MAX_READ_LINES, MAX_SEARCH_RESULTS, TOOL_NAME } from './investigation.consts';

const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });

/** Strict function tools: every property is required, optional ones are nullable. */
export const AGENT_TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: TOOL_NAME.SEARCH_CODE,
    description: `Search every text file of the repository line by line (case-insensitive). Returns the match count and up to ${MAX_SEARCH_RESULTS} "path:line: text" results.`,
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['pattern', 'isRegex', 'pathPrefix'],
      properties: {
        pattern: { type: 'string', description: 'Text to find, e.g. "require(\'lodash\')" or "_.template("' },
        isRegex: { type: 'boolean', description: 'Treat pattern as a JavaScript regular expression' },
        pathPrefix: nullable('string', 'Only search under this repo-relative folder, e.g. "src/"'),
      },
    },
  },
  {
    type: 'function',
    name: TOOL_NAME.READ_FILE,
    description: `Read a repository file with line numbers, at most ${MAX_READ_LINES} lines per call.`,
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['path', 'startLine', 'endLine'],
      properties: {
        path: { type: 'string', description: 'Repo-relative path, e.g. "app/routes/index.js"' },
        startLine: nullable('integer', 'First line (1-based), null for the start'),
        endLine: nullable('integer', 'Last line, null for as far as allowed'),
      },
    },
  },
  {
    type: 'function',
    name: TOOL_NAME.LIST_FILES,
    description: 'List the files and folders (folders end with "/") of a repository directory.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['path'],
      properties: {
        path: nullable('string', 'Repo-relative directory, null for the repository root'),
      },
    },
  },
];
