import { validateFlowchart } from './flowchart.mjs';

export async function execute(request) {
  if (request?.protocolVersion === 1 && request.operation === 'validate') {
    if (typeof request.source !== 'string') throw new TypeError('Validation source must be a string');
    return validateFlowchart(request.source);
  }
  return { status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED' };
}
