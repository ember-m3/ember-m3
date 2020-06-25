export default function serializeQueryParams(queryParamsObject) {
  return Object.keys(queryParamsObject)
    .map(key => `${key}=${queryParamsObject[key]}`)
    .join('&');
}
