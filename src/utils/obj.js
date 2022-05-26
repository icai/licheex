const pathSeperatorRegex =
  /\[\s*(['"])(.*?)\1\s*\]|^\s*(\w+)\s*(?=\.|\[|$)|\.\s*(\w*)\s*(?=\.|\[|$)|\[\s*(-?\d+)\s*\]/g;

export const isArray = (objectOrArray) => Array.isArray(objectOrArray);

export const clone = (objectOrArray) =>
  isArray(objectOrArray)
    ? Array.from(objectOrArray)
    : Object.assign({}, objectOrArray);

export const has = (object, key) => {
  return object != null && Object.prototype.hasOwnProperty.call(object, key);
};

export const get = (root, path, defaultValue) => {
  try {
    if (path in root) return root[path];
    if (Array.isArray(path)) path = "['" + path.join("']['") + "']";
    var obj = root;
    path.replace(
      pathSeperatorRegex,
      function (
        wholeMatch,
        quotationMark,
        quotedProp,
        firstLevel,
        namedProp,
        index
      ) {
        obj = obj[quotedProp || firstLevel || namedProp || index];
      }
    );
    return obj == undefined ? defaultValue : obj;
  } catch (err) {
    return defaultValue;
  }
};

export const set = (root, path, newValue) => {
  const newRoot = clone(root);
  if (typeof path === "number" || (!isArray(path) && path in newRoot)) {
    // Just set it directly: no need to loop
    newRoot[path] = newValue;
    return newRoot;
  }
  let currentParent = newRoot;
  let previousKey;
  let previousKeyIsArrayIndex = false;
  if (isArray(path)) {
    path = "['" + path.join("']['") + "']";
  }
  path.replace(
    pathSeperatorRegex,
    // @ts-ignore
    (wholeMatch, _quotationMark, quotedProp, firstLevel, namedProp, index) => {
      if (previousKey) {
        // Clone (or create) the object/array that we were just at: this lets us keep it attached to its parent.
        const previousValue = currentParent[previousKey];
        let newValue;
        if (previousValue) {
          newValue = clone(previousValue);
        } else if (previousKeyIsArrayIndex) {
          newValue = [];
        } else {
          newValue = {};
        }
        currentParent[previousKey] = newValue;
        // Now advance
        currentParent = newValue;
      }
      previousKey = quotedProp || firstLevel || namedProp || index;
      previousKeyIsArrayIndex = !!index;
      // This return makes the linter happy
      // return wholeMatch;
    }
  );
  currentParent[previousKey] = newValue;
  return newRoot;
};
