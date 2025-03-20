import { URI } from 'vscode-uri';

export function resolveSelectionUris(firstUri?: URI, allUris?: URI[]): URI[] {
  let uris: URI[] = [];

  if (allUris && allUris.length > 0) {
    uris = allUris.filter(u => URI.isUri(u));
  } else if (firstUri && URI.isUri(firstUri)) {
    uris = [firstUri];
  }

  return uris;
}
