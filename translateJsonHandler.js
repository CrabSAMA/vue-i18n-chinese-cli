export function splitJSON(json, maxLength) {
  let result = [];
  let currentStr = '[';
  for (let i = 0; i < json.length; i++) {
      let itemStr = JSON.stringify(json[i]);
      if (currentStr.length + itemStr.length + (i === json.length - 1? 1 : 2) > maxLength) {
          if (currentStr.length > 1) {
              currentStr = currentStr.slice(0, -1);
              currentStr += ']';
              result.push(currentStr);
              currentStr = '[';
          }
      }
      currentStr += itemStr;
      if (i < json.length - 1) {
          currentStr += ',';
      }
  }
  if (currentStr.length > 1) {
      currentStr += ']';
      result.push(currentStr);
  }
  return result;
}

export function mergeJSON(splitJSONs) {
  let merged = '';
  for (let i = 0; i < splitJSONs.length; i++) {
      let subJson = splitJSONs[i];
      if (i === 0) {
          merged = subJson;
      } else {
          subJson = subJson.slice(1, -1);
          merged = merged.slice(0, -1) + subJson + merged.slice(-1);
      }
  }
  return merged;
}