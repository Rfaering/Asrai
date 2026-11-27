import { parseFlowchart, validateFlowchart } from './flowchart.mjs';

export async function execute(request) {
  if (request?.protocolVersion === 1) {
    const { operation, source } = request;
    if (operation === 'validate') {
      if (typeof source !== 'string') throw new TypeError('Validation source must be a string');
      return validateFlowchart(source);
    }
    if (operation === 'parse') {
      if (typeof source !== 'string') throw new TypeError('Parse source must be a string');
      return parseFlowchart(source);
    }
  }
  return { status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED' };
}
