/*
* Find an object inside an object by its path
* @param {Object} obj The object in which to look
* @param {string} path The path of the desired object
* @return {Object} 
*/
export function deepFind(obj, path) {
    for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
        obj = obj[path[i]];
    }
    return obj;
}
